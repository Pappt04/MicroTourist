package com.microtourist.purchase.repository;

import com.microtourist.purchase.model.TourPurchaseToken;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TourPurchaseTokenRepository extends JpaRepository<TourPurchaseToken, Long> {
    List<TourPurchaseToken> findByTouristId(Long touristId);
    boolean existsByTouristIdAndTourId(Long touristId, String tourId);
}
