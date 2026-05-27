package com.microtourist.tours.controller;

import com.microtourist.tours.model.Review;
import com.microtourist.tours.model.Tour;
import com.microtourist.tours.model.TourExecution;
import com.microtourist.tours.model.Waypoint;
import com.microtourist.tours.saga.ArchiveSagaOrchestrator;
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
    private final ArchiveSagaOrchestrator archiveSaga;
    private final TokenUtil tokenUtil;

    public TourController(TourService tourService, ArchiveSagaOrchestrator archiveSaga, TokenUtil tokenUtil) {
        this.tourService = tourService;
        this.archiveSaga = archiveSaga;
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
        try {
            return ResponseEntity.ok(tourService.publish(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /** SAGA-based archive: archives locally then removes from all carts via Purchase service. */
    @PutMapping("/{id}/archive")
    public ResponseEntity<?> archive(@PathVariable String id, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        Tour existing = tourService.getById(id);
        if (!existing.getAuthorId().equals(user.userId())) return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
        try {
            return ResponseEntity.ok(archiveSaga.execute(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}/reactivate")
    public ResponseEntity<?> reactivate(@PathVariable String id, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        Tour existing = tourService.getById(id);
        if (!existing.getAuthorId().equals(user.userId())) return ResponseEntity.status(403).body(Map.of("error", "forbidden"));
        try {
            return ResponseEntity.ok(tourService.reactivate(id));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
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

    @PutMapping("/waypoints/{waypointId}")
    public Waypoint updateWaypoint(@PathVariable String waypointId, @RequestBody Waypoint waypoint) {
        return tourService.updateWaypoint(waypointId, waypoint);
    }

    @DeleteMapping("/waypoints/{waypointId}")
    public void deleteWaypoint(@PathVariable String waypointId) { tourService.deleteWaypoint(waypointId); }

    @GetMapping("/{id}/reviews")
    public List<Review> getReviews(@PathVariable String id) { return tourService.getReviews(id); }

    @PostMapping("/{id}/reviews")
    public ResponseEntity<?> addReview(@PathVariable String id, @RequestBody Review review, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        review.setAuthorId(user.userId());
        review.setAuthorUsername(user.username());
        return ResponseEntity.status(201).body(tourService.addReview(id, review));
    }

    @PutMapping("/position")
    public ResponseEntity<?> savePosition(@RequestBody Map<String, Double> body, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        Double lat = body.get("latitude");
        Double lng = body.get("longitude");
        if (lat == null || lng == null) return ResponseEntity.badRequest().body(Map.of("error", "latitude and longitude required"));
        return ResponseEntity.ok(tourService.savePosition(user.userId(), lat, lng));
    }

    @GetMapping("/position")
    public ResponseEntity<?> getPosition(HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        return tourService.getPosition(user.userId())
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(Map.of()));
    }

    /**
     * Internal endpoint — called by Checkout SAGA Step 3 to increment purchaseCount
     * for each purchased tour.
     */
    @PostMapping("/internal/record-purchases")
    public ResponseEntity<?> recordPurchases(@RequestBody Map<String, Object> body) {
        Long touristId = Long.parseLong(body.get("touristId").toString());
        @SuppressWarnings("unchecked")
        List<String> tourIds = (List<String>) body.get("tourIds");
        tourService.recordPurchases(touristId, tourIds);
        return ResponseEntity.ok(Map.of("message", "purchases recorded"));
    }

    @PostMapping("/{tourId}/start")
    public ResponseEntity<?> startExecution(@PathVariable String tourId, @RequestBody Map<String, Double> body, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        if (!"tourist".equals(user.role())) return ResponseEntity.status(403).body(Map.of("error", "only tourists can start tours"));
        Double lat = body.get("latitude");
        Double lng = body.get("longitude");
        if (lat == null || lng == null) return ResponseEntity.badRequest().body(Map.of("error", "latitude and longitude required"));
        try {
            return ResponseEntity.status(201).body(tourService.startExecution(user.userId(), tourId, lat, lng));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/executions/{id}/check-position")
    public ResponseEntity<?> checkPosition(@PathVariable String id, @RequestBody Map<String, Double> body, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        Double lat = body.get("latitude");
        Double lng = body.get("longitude");
        if (lat == null || lng == null) return ResponseEntity.badRequest().body(Map.of("error", "latitude and longitude required"));
        try {
            return ResponseEntity.ok(tourService.checkPosition(id, user.userId(), lat, lng));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/executions/{id}/complete")
    public ResponseEntity<?> completeExecution(@PathVariable String id, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        try {
            return ResponseEntity.ok(tourService.completeExecution(id, user.userId()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/executions/{id}/abandon")
    public ResponseEntity<?> abandonExecution(@PathVariable String id, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        try {
            return ResponseEntity.ok(tourService.abandonExecution(id, user.userId()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/executions/active")
    public ResponseEntity<?> getActiveExecution(HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        return tourService.getActiveExecution(user.userId())
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.ok(Map.of()));
    }
}
