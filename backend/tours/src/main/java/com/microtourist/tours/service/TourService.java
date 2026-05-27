package com.microtourist.tours.service;

import com.microtourist.tours.model.Review;
import com.microtourist.tours.model.Tour;
import com.microtourist.tours.model.TourExecution;
import com.microtourist.tours.model.TouristPosition;
import com.microtourist.tours.model.Waypoint;
import com.microtourist.tours.model.WaypointVisit;
import com.microtourist.tours.repository.ReviewRepository;
import com.microtourist.tours.repository.TouristPositionRepository;
import com.microtourist.tours.repository.TourExecutionRepository;
import com.microtourist.tours.repository.TourRepository;
import com.microtourist.tours.repository.WaypointRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class TourService {

    private final TourRepository tourRepo;
    private final WaypointRepository waypointRepo;
    private final ReviewRepository reviewRepo;
    private final TouristPositionRepository positionRepo;
    private final TourExecutionRepository executionRepo;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${purchase.service.url:http://localhost:8082}")
    private String purchaseUrl;

    public TourService(TourRepository tourRepo, WaypointRepository waypointRepo, ReviewRepository reviewRepo,
                       TouristPositionRepository positionRepo, TourExecutionRepository executionRepo) {
        this.tourRepo = tourRepo;
        this.waypointRepo = waypointRepo;
        this.reviewRepo = reviewRepo;
        this.positionRepo = positionRepo;
        this.executionRepo = executionRepo;
    }

    public List<Tour> getAll() { return tourRepo.findAll(); }

    public List<Tour> getPublished() { return tourRepo.findByStatus("PUBLISHED"); }

    public List<Tour> getByAuthorId(Long authorId) { return tourRepo.findByAuthorId(authorId); }

    public Tour getById(String id) {
        return tourRepo.findById(id).orElseThrow(() -> new RuntimeException("Tour not found"));
    }

    public Tour save(Tour tour) { return tourRepo.save(tour); }

    public Tour update(String id, Tour data) {
        Tour tour = getById(id);
        if (data.getTitle() != null) tour.setTitle(data.getTitle());
        if (data.getDescription() != null) tour.setDescription(data.getDescription());
        if (data.getDifficulty() != null) tour.setDifficulty(data.getDifficulty());
        if (data.getTags() != null) tour.setTags(data.getTags());
        if (data.getTransportTimes() != null) tour.setTransportTimes(data.getTransportTimes());
        tour.setPrice(data.getPrice());
        return tourRepo.save(tour);
    }

    public Tour publish(String id) {
        Tour tour = getById(id);
        if (tour.getTitle() == null || tour.getTitle().isBlank())
            throw new RuntimeException("Tour must have a title");
        if (tour.getDescription() == null || tour.getDescription().isBlank())
            throw new RuntimeException("Tour must have a description");
        if (tour.getDifficulty() == null || tour.getDifficulty().isBlank())
            throw new RuntimeException("Tour must have a difficulty level");
        if (tour.getTags() == null || tour.getTags().isEmpty())
            throw new RuntimeException("Tour must have at least one tag");
        List<Waypoint> waypoints = waypointRepo.findByTourIdOrderByOrderIndex(id);
        if (waypoints.size() < 2)
            throw new RuntimeException("Tour must have at least 2 waypoints");
        if (tour.getTransportTimes() == null || tour.getTransportTimes().isEmpty())
            throw new RuntimeException("Tour must have at least one transport time defined");
        tour.setStatus("PUBLISHED");
        tour.setPublishedAt(LocalDateTime.now(ZoneId.of("Europe/Belgrade")));
        return tourRepo.save(tour);
    }

    public Tour archive(String id) {
        Tour tour = getById(id);
        tour.setStatus("ARCHIVED");
        tour.setArchivedAt(LocalDateTime.now(ZoneId.of("Europe/Belgrade")));
        return tourRepo.save(tour);
    }

    public Tour reactivate(String id) {
        Tour tour = getById(id);
        if (!"ARCHIVED".equals(tour.getStatus()))
            throw new RuntimeException("Only archived tours can be reactivated");
        tour.setStatus("PUBLISHED");
        tour.setPublishedAt(LocalDateTime.now(ZoneId.of("Europe/Belgrade")));
        tour.setArchivedAt(null);
        return tourRepo.save(tour);
    }

    public void delete(String id) {
        waypointRepo.deleteByTourId(id);
        reviewRepo.deleteAll(reviewRepo.findByTourId(id));
        tourRepo.deleteById(id);
    }

    private double haversineKm(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private void recalculateLength(String tourId) {
        List<Waypoint> wps = waypointRepo.findByTourIdOrderByOrderIndex(tourId);
        double total = 0;
        for (int i = 1; i < wps.size(); i++) {
            total += haversineKm(wps.get(i - 1).getLatitude(), wps.get(i - 1).getLongitude(),
                    wps.get(i).getLatitude(), wps.get(i).getLongitude());
        }
        Tour tour = getById(tourId);
        tour.setLengthKm(Math.round(total * 100.0) / 100.0);
        tourRepo.save(tour);
    }

    public List<Waypoint> getWaypoints(String tourId) {
        return waypointRepo.findByTourIdOrderByOrderIndex(tourId);
    }

    public Waypoint addWaypoint(String tourId, Waypoint waypoint) {
        getById(tourId);
        waypoint.setTourId(tourId);
        Waypoint saved = waypointRepo.save(waypoint);
        recalculateLength(tourId);
        return saved;
    }

    public Waypoint updateWaypoint(String waypointId, Waypoint data) {
        Waypoint wp = waypointRepo.findById(waypointId)
                .orElseThrow(() -> new RuntimeException("Waypoint not found"));
        if (data.getName() != null) wp.setName(data.getName());
        if (data.getDescription() != null) wp.setDescription(data.getDescription());
        if (data.getImage() != null) wp.setImage(data.getImage());
        wp.setLatitude(data.getLatitude());
        wp.setLongitude(data.getLongitude());
        wp.setOrderIndex(data.getOrderIndex());
        Waypoint saved = waypointRepo.save(wp);
        recalculateLength(wp.getTourId());
        return saved;
    }

    public void deleteWaypoint(String waypointId) {
        Waypoint wp = waypointRepo.findById(waypointId)
                .orElseThrow(() -> new RuntimeException("Waypoint not found"));
        String tourId = wp.getTourId();
        waypointRepo.deleteById(waypointId);
        recalculateLength(tourId);
    }

    public List<Review> getReviews(String tourId) {
        return reviewRepo.findByTourId(tourId);
    }

    public Review addReview(String tourId, Review review) {
        getById(tourId);
        review.setTourId(tourId);
        return reviewRepo.save(review);
    }

    public TouristPosition savePosition(Long userId, double lat, double lng) {
        TouristPosition pos = positionRepo.findByUserId(userId).orElse(new TouristPosition());
        pos.setUserId(userId);
        pos.setLatitude(lat);
        pos.setLongitude(lng);
        pos.setUpdatedAt(LocalDateTime.now(ZoneId.of("Europe/Belgrade")));
        return positionRepo.save(pos);
    }

    public Optional<TouristPosition> getPosition(Long userId) {
        return positionRepo.findByUserId(userId);
    }

    /** Called by Checkout SAGA Step 3 — increments purchaseCount for each bought tour. */
    public void recordPurchases(Long touristId, List<String> tourIds) {
        for (String tourId : tourIds) {
            tourRepo.findById(tourId).ifPresent(t -> {
                t.setPurchaseCount(t.getPurchaseCount() + 1);
                tourRepo.save(t);
            });
        }
    }

    public TourExecution startExecution(Long touristId, String tourId, double lat, double lng) {
        Tour tour = getById(tourId);
        if (!"PUBLISHED".equals(tour.getStatus()) && !"ARCHIVED".equals(tour.getStatus())) {
            throw new RuntimeException("Only published or archived tours can be started");
        }

        executionRepo.findByTouristIdAndTourIdAndStatus(touristId, tourId, "ACTIVE")
                .ifPresent(e -> { throw new RuntimeException("An active session for this tour already exists"); });

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = restTemplate.getForObject(
                    purchaseUrl + "/internal/purchases/check?touristId=" + touristId + "&tourId=" + tourId, Map.class);
            if (result == null || !Boolean.TRUE.equals(result.get("purchased"))) {
                throw new RuntimeException("Tour must be purchased before starting");
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Could not verify purchase: " + e.getMessage());
        }

        TourExecution execution = new TourExecution();
        execution.setTourId(tourId);
        execution.setTouristId(touristId);
        execution.setStatus("ACTIVE");
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Europe/Belgrade"));
        execution.setStartedAt(now);
        execution.setStartLatitude(lat);
        execution.setStartLongitude(lng);
        execution.setLastActivity(now);
        execution.setVisitedWaypoints(new ArrayList<>());
        return executionRepo.save(execution);
    }

    public TourExecution checkPosition(String executionId, Long touristId, double lat, double lng) {
        TourExecution execution = executionRepo.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));
        if (!execution.getTouristId().equals(touristId)) {
            throw new RuntimeException("Forbidden");
        }
        if (!"ACTIVE".equals(execution.getStatus())) {
            throw new RuntimeException("Session is not active");
        }

        List<Waypoint> waypoints = waypointRepo.findByTourIdOrderByOrderIndex(execution.getTourId());
        List<WaypointVisit> visited = execution.getVisitedWaypoints();
        boolean changed = false;

        for (Waypoint wp : waypoints) {
            boolean alreadyVisited = visited.stream().anyMatch(v -> v.getWaypointId().equals(wp.getId()));
            if (!alreadyVisited && haversineKm(lat, lng, wp.getLatitude(), wp.getLongitude()) <= 0.1) {
                visited.add(new WaypointVisit(wp.getId(), LocalDateTime.now(ZoneId.of("Europe/Belgrade"))));
                changed = true;
            }
        }

        if (changed) execution.setVisitedWaypoints(visited);
        execution.setLastActivity(LocalDateTime.now(ZoneId.of("Europe/Belgrade")));
        return executionRepo.save(execution);
    }

    public TourExecution completeExecution(String executionId, Long touristId) {
        TourExecution execution = executionRepo.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));
        if (!execution.getTouristId().equals(touristId)) {
            throw new RuntimeException("Forbidden");
        }
        if (!"ACTIVE".equals(execution.getStatus())) {
            throw new RuntimeException("Session is not active");
        }
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Europe/Belgrade"));
        execution.setStatus("COMPLETED");
        execution.setCompletedAt(now);
        execution.setLastActivity(now);
        return executionRepo.save(execution);
    }

    public TourExecution abandonExecution(String executionId, Long touristId) {
        TourExecution execution = executionRepo.findById(executionId)
                .orElseThrow(() -> new RuntimeException("Execution not found"));
        if (!execution.getTouristId().equals(touristId)) {
            throw new RuntimeException("Forbidden");
        }
        if (!"ACTIVE".equals(execution.getStatus())) {
            throw new RuntimeException("Session is not active");
        }
        LocalDateTime now = LocalDateTime.now(ZoneId.of("Europe/Belgrade"));
        execution.setStatus("ABANDONED");
        execution.setAbandonedAt(now);
        execution.setLastActivity(now);
        return executionRepo.save(execution);
    }

    public Optional<TourExecution> getActiveExecution(Long touristId) {
        return executionRepo.findByTouristIdAndStatus(touristId, "ACTIVE");
    }
}
