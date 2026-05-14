package com.microtourist.tours.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "waypoints")
public class Waypoint {

    @Id
    private String id;

    private String tourId;
    private String name;
    private String description;
    private double latitude;
    private double longitude;
    private String image;
    private int orderIndex;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTourId() { return tourId; }
    public void setTourId(String tourId) { this.tourId = tourId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public double getLatitude() { return latitude; }
    public void setLatitude(double latitude) { this.latitude = latitude; }
    public double getLongitude() { return longitude; }
    public void setLongitude(double longitude) { this.longitude = longitude; }
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }
    public int getOrderIndex() { return orderIndex; }
    public void setOrderIndex(int orderIndex) { this.orderIndex = orderIndex; }
}
