package com.microtourist.tours.saga;

import com.microtourist.tours.model.Tour;
import com.microtourist.tours.repository.TourRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * Orchestrates the Tour Archive SAGA spanning Tours (local) and Purchase (remote).
 *
 * Step 1 [Local Tours]    – archive the tour in MongoDB (committed immediately)
 * Step 2 [Remote Purchase]– remove the tour from all active carts
 *
 * Compensation C1 (on Step 2 failure): reactivate the tour (restore previous status).
 */
@Service
public class ArchiveSagaOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(ArchiveSagaOrchestrator.class);

    private final TourRepository tourRepo;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${purchase.service.url:http://localhost:8082}")
    private String purchaseUrl;

    public ArchiveSagaOrchestrator(TourRepository tourRepo) {
        this.tourRepo = tourRepo;
    }

    public Tour execute(String tourId) {
        Tour tour = tourRepo.findById(tourId)
                .orElseThrow(() -> new RuntimeException("Tour not found"));

        String previousStatus = tour.getStatus();
        LocalDateTime previousArchivedAt = tour.getArchivedAt();

        // SAGA Step 1 [Local]: archive tour — committed to MongoDB
        tour.setStatus("ARCHIVED");
        tour.setArchivedAt(LocalDateTime.now(ZoneId.of("Europe/Belgrade")));
        Tour archived = tourRepo.save(tour);
        log.info("SAGA Archive Step 1 committed: tour {} archived", tourId);

        // SAGA Step 2 [Remote]: remove tour from all carts in Purchase service
        try {
            restTemplate.delete(purchaseUrl + "/internal/carts/tour/" + tourId);
            log.info("SAGA Archive Step 2 succeeded: tour {} removed from all carts", tourId);
        } catch (Exception e) {
            log.warn("SAGA Archive Step 2 failed — compensating Step 1: {}", e.getMessage());
            // Compensation C1: restore tour to its previous state
            archived.setStatus(previousStatus);
            archived.setArchivedAt(previousArchivedAt);
            tourRepo.save(archived);
            throw new RuntimeException("Archive SAGA compensated: " + e.getMessage());
        }

        return archived;
    }
}
