package com.microtourist.tours.repository;

import com.microtourist.tours.model.TouristPosition;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface TouristPositionRepository extends MongoRepository<TouristPosition, String> {
    Optional<TouristPosition> findByUserId(Long userId);
}
