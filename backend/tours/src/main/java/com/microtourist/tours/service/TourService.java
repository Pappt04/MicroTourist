package com.microtourist.tours.service;

import com.microtourist.tours.model.Review;
import com.microtourist.tours.model.Tour;
import com.microtourist.tours.model.TouristPosition;
import com.microtourist.tours.model.Waypoint;
import com.microtourist.tours.repository.ReviewRepository;
import com.microtourist.tours.repository.TouristPositionRepository;
import com.microtourist.tours.repository.TourRepository;
import com.microtourist.tours.repository.WaypointRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class TourService {

    private final TourRepository tourRepo;
    private final WaypointRepository waypointRepo;
    private final ReviewRepository reviewRepo;
    private final TouristPositionRepository positionRepo;

    public TourService(TourRepository tourRepo, WaypointRepository waypointRepo, ReviewRepository reviewRepo, TouristPositionRepository positionRepo) {
        this.tourRepo = tourRepo;
        this.waypointRepo = waypointRepo;
        this.reviewRepo = reviewRepo;
        this.positionRepo = positionRepo;
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
        tour.setPrice(data.getPrice());
        return tourRepo.save(tour);
    }

    public Tour publish(String id) {
        Tour tour = getById(id);
        List<Waypoint> waypoints = waypointRepo.findByTourIdOrderByOrderIndex(id);
        if (waypoints.size() < 2) throw new RuntimeException("At least 2 waypoints required to publish");
        tour.setStatus("PUBLISHED");
        return tourRepo.save(tour);
    }

    public Tour archive(String id) {
        Tour tour = getById(id);
        tour.setStatus("ARCHIVED");
        return tourRepo.save(tour);
    }

    public void delete(String id) {
        waypointRepo.deleteByTourId(id);
        reviewRepo.deleteAll(reviewRepo.findByTourId(id));
        tourRepo.deleteById(id);
    }

    public List<Waypoint> getWaypoints(String tourId) {
        return waypointRepo.findByTourIdOrderByOrderIndex(tourId);
    }

    public Waypoint addWaypoint(String tourId, Waypoint waypoint) {
        getById(tourId);
        waypoint.setTourId(tourId);
        return waypointRepo.save(waypoint);
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
        return waypointRepo.save(wp);
    }

    public void deleteWaypoint(String waypointId) {
        waypointRepo.deleteById(waypointId);
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
        pos.setUpdatedAt(LocalDateTime.now());
        return positionRepo.save(pos);
    }

    public Optional<TouristPosition> getPosition(Long userId) {
        return positionRepo.findByUserId(userId);
    }
}
