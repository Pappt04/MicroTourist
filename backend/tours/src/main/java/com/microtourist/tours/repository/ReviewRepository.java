package com.microtourist.tours.repository;

import com.microtourist.tours.model.Review;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ReviewRepository extends MongoRepository<Review, String> {
    List<Review> findByTourId(String tourId);
}
