package com.microtourist.tours.repository;

import com.microtourist.tours.model.Waypoint;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface WaypointRepository extends JpaRepository<Waypoint, Long> {
    List<Waypoint> findByTourIdOrderByOrderIndex(Long tourId);
    void deleteByTourId(Long tourId);
}
