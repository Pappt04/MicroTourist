package com.microtourist.purchase.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "tour_purchase_tokens")
public class TourPurchaseToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long touristId;
    private String tourId;
    private String tourName;
    private double price;
    private LocalDateTime purchasedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Long getTouristId() { return touristId; }
    public void setTouristId(Long touristId) { this.touristId = touristId; }
    public String getTourId() { return tourId; }
    public void setTourId(String tourId) { this.tourId = tourId; }
    public String getTourName() { return tourName; }
    public void setTourName(String tourName) { this.tourName = tourName; }
    public double getPrice() { return price; }
    public void setPrice(double price) { this.price = price; }
    public LocalDateTime getPurchasedAt() { return purchasedAt; }
    public void setPurchasedAt(LocalDateTime purchasedAt) { this.purchasedAt = purchasedAt; }
}
