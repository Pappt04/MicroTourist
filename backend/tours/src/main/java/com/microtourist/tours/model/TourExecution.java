package com.microtourist.tours.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "tour_executions")
public class TourExecution {

    @Id
    private String id;

    private String tourId;
    private Long touristId;
    private String status; // ACTIVE | COMPLETED | ABANDONED
    private LocalDateTime startedAt;
    private Double startLatitude;
    private Double startLongitude;
    private LocalDateTime completedAt;
    private LocalDateTime abandonedAt;
    private LocalDateTime lastActivity;
    private List<WaypointVisit> visitedWaypoints = new ArrayList<>();

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTourId() { return tourId; }
    public void setTourId(String tourId) { this.tourId = tourId; }
    public Long getTouristId() { return touristId; }
    public void setTouristId(Long touristId) { this.touristId = touristId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getStartedAt() { return startedAt; }
    public void setStartedAt(LocalDateTime startedAt) { this.startedAt = startedAt; }
    public Double getStartLatitude() { return startLatitude; }
    public void setStartLatitude(Double startLatitude) { this.startLatitude = startLatitude; }
    public Double getStartLongitude() { return startLongitude; }
    public void setStartLongitude(Double startLongitude) { this.startLongitude = startLongitude; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
    public LocalDateTime getAbandonedAt() { return abandonedAt; }
    public void setAbandonedAt(LocalDateTime abandonedAt) { this.abandonedAt = abandonedAt; }
    public LocalDateTime getLastActivity() { return lastActivity; }
    public void setLastActivity(LocalDateTime lastActivity) { this.lastActivity = lastActivity; }
    public List<WaypointVisit> getVisitedWaypoints() { return visitedWaypoints; }
    public void setVisitedWaypoints(List<WaypointVisit> visitedWaypoints) { this.visitedWaypoints = visitedWaypoints; }
}
