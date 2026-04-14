package com.microtourist.tours.controller;

import com.microtourist.tours.model.Review;
import com.microtourist.tours.model.Tour;
import com.microtourist.tours.model.Waypoint;
import com.microtourist.tours.service.TourService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@CrossOrigin("*")
@RequestMapping("/tours")
public class TourController {

    private final TourService tourService;

    public TourController(TourService tourService) {
        this.tourService = tourService;
    }

    @GetMapping
    public List<Tour> getAll() { return tourService.getAll(); }

    @GetMapping("/published")
    public List<Tour> getPublished() { return tourService.getPublished(); }

    @GetMapping("/{id}")
    public Tour getById(@PathVariable Long id) { return tourService.getById(id); }

    @PostMapping
    public Tour create(@RequestBody Tour tour) { return tourService.save(tour); }

    @PutMapping("/{id}")
    public Tour update(@PathVariable Long id, @RequestBody Tour tour) { return tourService.update(id, tour); }

    @PutMapping("/{id}/publish")
    public Tour publish(@PathVariable Long id) { return tourService.publish(id); }

    @PutMapping("/{id}/archive")
    public Tour archive(@PathVariable Long id) { return tourService.archive(id); }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable Long id) { tourService.delete(id); }

    @GetMapping("/{id}/waypoints")
    public List<Waypoint> getWaypoints(@PathVariable Long id) { return tourService.getWaypoints(id); }

    @PostMapping("/{id}/waypoints")
    public Waypoint addWaypoint(@PathVariable Long id, @RequestBody Waypoint waypoint) {
        return tourService.addWaypoint(id, waypoint);
    }

    @DeleteMapping("/waypoints/{waypointId}")
    public void deleteWaypoint(@PathVariable Long waypointId) { tourService.deleteWaypoint(waypointId); }

    @GetMapping("/{id}/reviews")
    public List<Review> getReviews(@PathVariable Long id) { return tourService.getReviews(id); }

    @PostMapping("/{id}/reviews")
    public Review addReview(@PathVariable Long id, @RequestBody Review review) {
        return tourService.addReview(id, review);
    }
}
