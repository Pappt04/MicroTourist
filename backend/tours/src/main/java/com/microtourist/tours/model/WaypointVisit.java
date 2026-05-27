package com.microtourist.tours.model;

import java.time.LocalDateTime;

public class WaypointVisit {
    private String waypointId;
    private LocalDateTime completedAt;

    public WaypointVisit() {}

    public WaypointVisit(String waypointId, LocalDateTime completedAt) {
        this.waypointId = waypointId;
        this.completedAt = completedAt;
    }

    public String getWaypointId() { return waypointId; }
    public void setWaypointId(String waypointId) { this.waypointId = waypointId; }
    public LocalDateTime getCompletedAt() { return completedAt; }
    public void setCompletedAt(LocalDateTime completedAt) { this.completedAt = completedAt; }
}
