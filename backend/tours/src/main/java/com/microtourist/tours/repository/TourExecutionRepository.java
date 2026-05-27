package com.microtourist.tours.repository;

import com.microtourist.tours.model.TourExecution;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface TourExecutionRepository extends MongoRepository<TourExecution, String> {
    Optional<TourExecution> findByTouristIdAndStatus(Long touristId, String status);
    Optional<TourExecution> findByTouristIdAndTourIdAndStatus(Long touristId, String tourId, String status);
}
