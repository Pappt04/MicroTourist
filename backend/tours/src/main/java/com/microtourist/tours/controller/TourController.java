package com.microtourist.tours.controller;

import com.microtourist.tours.model.Review;
import com.microtourist.tours.model.Tour;
import com.microtourist.tours.model.Waypoint;
import com.microtourist.tours.service.TourService;
import com.microtourist.tours.util.TokenUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@CrossOrigin("*")
@RequestMapping("/tours")
public class TourController {

    private final TourService tourService;
    private final TokenUtil tokenUtil;

    public TourController(TourService tourService, TokenUtil tokenUtil) {
        this.tourService = tourService;
        this.tokenUtil = tokenUtil;
    }

    private TokenUtil.TokenPayload auth(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        return tokenUtil.validateToken(header.substring(7));
    }

    @GetMapping
    public List<Tour> getAll() { return tourService.getAll(); }

    @GetMapping("/published")
    public List<Tour> getPublished() { return tourService.getPublished(); }

    @GetMapping("/my")
    public ResponseEntity<?> getMyTours(HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        if (!"guide".equals(user.role())) return ResponseEntity.status(403).body(Map.of("error", "only guides can access their tours"));
        return ResponseEntity.ok(tourService.getByAuthorId(user.userId()));
    }

    @GetMapping("/{id}")
    public Tour getById(@PathVariable String id) { return tourService.getById(id); }

    @PostMapping
    public ResponseEntity<?> create(@RequestBody Tour tour, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        if (!"guide".equals(user.role())) return ResponseEntity.status(403).body(Map.of("error", "only guides can create tours"));

        tour.setAuthorId(user.userId());
        tour.setStatus("DRAFT");
        tour.setPrice(0);
        return ResponseEntity.status(201).body(tourService.save(tour));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable String id, @RequestBody Tour tour, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        Tour existing = tourService.getById(id);
        if (!existing.getAuthorId().equals(user.userId())) return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
        return ResponseEntity.ok(tourService.update(id, tour));
    }

    @PutMapping("/{id}/publish")
    public ResponseEntity<?> publish(@PathVariable String id, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        Tour existing = tourService.getById(id);
        if (!existing.getAuthorId().equals(user.userId())) return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
        return ResponseEntity.ok(tourService.publish(id));
    }

    @PutMapping("/{id}/archive")
    public ResponseEntity<?> archive(@PathVariable String id, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        Tour existing = tourService.getById(id);
        if (!existing.getAuthorId().equals(user.userId())) return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
        return ResponseEntity.ok(tourService.archive(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        Tour existing = tourService.getById(id);
        if (!existing.getAuthorId().equals(user.userId())) return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
        tourService.delete(id);
        return ResponseEntity.ok(Map.of("message", "deleted"));
    }

    @GetMapping("/{id}/waypoints")
    public List<Waypoint> getWaypoints(@PathVariable String id) { return tourService.getWaypoints(id); }

    @PostMapping("/{id}/waypoints")
    public Waypoint addWaypoint(@PathVariable String id, @RequestBody Waypoint waypoint) {
        return tourService.addWaypoint(id, waypoint);
    }

    @DeleteMapping("/waypoints/{waypointId}")
    public void deleteWaypoint(@PathVariable String waypointId) { tourService.deleteWaypoint(waypointId); }

    @GetMapping("/{id}/reviews")
    public List<Review> getReviews(@PathVariable String id) { return tourService.getReviews(id); }

    @PostMapping("/{id}/reviews")
    public Review addReview(@PathVariable String id, @RequestBody Review review) {
        return tourService.addReview(id, review);
    }
}
