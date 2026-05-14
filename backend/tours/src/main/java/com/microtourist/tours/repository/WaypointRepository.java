package com.microtourist.tours.repository;

import com.microtourist.tours.model.Waypoint;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface WaypointRepository extends MongoRepository<Waypoint, String> {
    List<Waypoint> findByTourIdOrderByOrderIndex(String tourId);
    void deleteByTourId(String tourId);
}
