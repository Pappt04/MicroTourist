package com.microtourist.tours.service;

import com.microtourist.tours.model.Review;
import com.microtourist.tours.model.Tour;
import com.microtourist.tours.model.Waypoint;
import com.microtourist.tours.repository.ReviewRepository;
import com.microtourist.tours.repository.TourRepository;
import com.microtourist.tours.repository.WaypointRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class TourService {

    private final TourRepository tourRepo;
    private final WaypointRepository waypointRepo;
    private final ReviewRepository reviewRepo;

    public TourService(TourRepository tourRepo, WaypointRepository waypointRepo, ReviewRepository reviewRepo) {
        this.tourRepo = tourRepo;
        this.waypointRepo = waypointRepo;
        this.reviewRepo = reviewRepo;
    }

    public List<Tour> getAll() { return tourRepo.findAll(); }

    public List<Tour> getPublished() { return tourRepo.findByStatus("PUBLISHED"); }

    public Tour getById(Long id) {
        return tourRepo.findById(id).orElseThrow(() -> new RuntimeException("Tour not found"));
    }

    public Tour save(Tour tour) { return tourRepo.save(tour); }

    public Tour update(Long id, Tour data) {
        Tour tour = getById(id);
        if (data.getTitle() != null) tour.setTitle(data.getTitle());
        if (data.getDescription() != null) tour.setDescription(data.getDescription());
        if (data.getDifficulty() != null) tour.setDifficulty(data.getDifficulty());
        if (data.getTags() != null) tour.setTags(data.getTags());
        tour.setPrice(data.getPrice());
        return tourRepo.save(tour);
    }

    public Tour publish(Long id) {
        Tour tour = getById(id);
        List<Waypoint> waypoints = waypointRepo.findByTourIdOrderByOrderIndex(id);
        if (waypoints.size() < 2) throw new RuntimeException("At least 2 waypoints required to publish");
        tour.setStatus("PUBLISHED");
        return tourRepo.save(tour);
    }

    public Tour archive(Long id) {
        Tour tour = getById(id);
        tour.setStatus("ARCHIVED");
        return tourRepo.save(tour);
    }

    @Transactional
    public void delete(Long id) {
        waypointRepo.deleteByTourId(id);
        reviewRepo.deleteAll(reviewRepo.findByTourId(id));
        tourRepo.deleteById(id);
    }

    public List<Waypoint> getWaypoints(Long tourId) {
        return waypointRepo.findByTourIdOrderByOrderIndex(tourId);
    }

    public Waypoint addWaypoint(Long tourId, Waypoint waypoint) {
        getById(tourId);
        waypoint.setTourId(tourId);
        return waypointRepo.save(waypoint);
    }

    public void deleteWaypoint(Long waypointId) {
        waypointRepo.deleteById(waypointId);
    }

    public List<Review> getReviews(Long tourId) {
        return reviewRepo.findByTourId(tourId);
    }

    public Review addReview(Long tourId, Review review) {
        getById(tourId);
        review.setTourId(tourId);
        return reviewRepo.save(review);
    }
}
