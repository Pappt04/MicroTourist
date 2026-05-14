package com.microtourist.tours.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Document(collection = "reviews")
public class Review {

    @Id
    private String id;

    private String tourId;
    private Long authorId;
    private int rating;
    private String comment;
    private LocalDate visitDate;
    private LocalDateTime createdAt = LocalDateTime.now();
    private List<String> images;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    public String getTourId() { return tourId; }
    public void setTourId(String tourId) { this.tourId = tourId; }
    public Long getAuthorId() { return authorId; }
    public void setAuthorId(Long authorId) { this.authorId = authorId; }
    public int getRating() { return rating; }
    public void setRating(int rating) { this.rating = rating; }
    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
    public LocalDate getVisitDate() { return visitDate; }
    public void setVisitDate(LocalDate visitDate) { this.visitDate = visitDate; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    public List<String> getImages() { return images; }
    public void setImages(List<String> images) { this.images = images; }
}
