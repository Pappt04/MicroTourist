package com.microtourist.tours.repository;

import com.microtourist.tours.model.Tour;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface TourRepository extends MongoRepository<Tour, String> {
    List<Tour> findByAuthorId(Long authorId);
    List<Tour> findByStatus(String status);
}
