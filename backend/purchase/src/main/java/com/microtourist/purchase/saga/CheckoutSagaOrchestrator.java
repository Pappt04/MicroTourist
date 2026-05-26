package com.microtourist.purchase.saga;

import com.microtourist.purchase.model.ShoppingCart;
import com.microtourist.purchase.model.TourPurchaseToken;
import com.microtourist.purchase.repository.ShoppingCartRepository;
import com.microtourist.purchase.saga.PurchaseSagaHelper.CartItemSnapshot;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Orchestrates the Checkout SAGA spanning Purchase (local) and Tours (remote).
 *
 * Step 1 [Remote Tours]  – validate each tour is PUBLISHED
 * Step 2 [Local Purchase] – commit tokens + clear cart (REQUIRES_NEW tx, commits immediately)
 * Step 3 [Remote Tours]  – record purchases (update purchaseCount per tour)
 *
 * Compensation C2 (on Step 3 failure): delete tokens, restore cart items.
 */
@Service
public class CheckoutSagaOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(CheckoutSagaOrchestrator.class);

    private final ShoppingCartRepository cartRepo;
    private final PurchaseSagaHelper sagaHelper;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${tours.service.url:http://localhost:8084}")
    private String toursUrl;

    public CheckoutSagaOrchestrator(ShoppingCartRepository cartRepo, PurchaseSagaHelper sagaHelper) {
        this.cartRepo = cartRepo;
        this.sagaHelper = sagaHelper;
    }

    public List<TourPurchaseToken> execute(Long touristId) {
        ShoppingCart cart = cartRepo.findByTouristId(touristId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));

        if (cart.getItems().isEmpty()) throw new RuntimeException("Cart is empty");

        List<CartItemSnapshot> snapshots = cart.getItems().stream()
                .map(i -> new CartItemSnapshot(i.getTourId(), i.getTourName(), i.getPrice()))
                .collect(Collectors.toList());

        // SAGA Step 1 [Remote]: validate all tours are still PUBLISHED
        sagaStep1_validateTours(snapshots);

        // SAGA Step 2 [Local, REQUIRES_NEW]: commit tokens + clear cart
        List<TourPurchaseToken> tokens = sagaHelper.commitCheckout(touristId, snapshots);
        log.info("SAGA Checkout Step 2 committed: {} tokens for tourist {}", tokens.size(), touristId);

        // SAGA Step 3 [Remote]: notify Tours to record purchases (increments purchaseCount)
        try {
            sagaStep3_recordPurchases(touristId, snapshots);
            log.info("SAGA Checkout Step 3 succeeded");
        } catch (Exception e) {
            log.warn("SAGA Checkout Step 3 failed — compensating Step 2: {}", e.getMessage());
            sagaHelper.compensateCheckout(touristId, tokens, snapshots);
            throw new RuntimeException("Checkout SAGA compensated: " + e.getMessage());
        }

        return tokens;
    }

    private void sagaStep1_validateTours(List<CartItemSnapshot> items) {
        for (CartItemSnapshot item : items) {
            try {
                @SuppressWarnings("unchecked")
                Map<String, Object> tour = restTemplate.getForObject(
                        toursUrl + "/tours/" + item.tourId(), Map.class);
                if (tour == null || !"PUBLISHED".equals(tour.get("status"))) {
                    throw new RuntimeException(
                            "Tour '" + item.tourName() + "' is not available for purchase");
                }
            } catch (RuntimeException e) {
                if (e.getMessage() != null && e.getMessage().contains("not available")) throw e;
                log.warn("Tours service unreachable during validation — proceeding: {}", e.getMessage());
            }
        }
    }

    @SuppressWarnings("unchecked")
    private void sagaStep3_recordPurchases(Long touristId, List<CartItemSnapshot> items) {
        List<String> tourIds = items.stream().map(CartItemSnapshot::tourId).collect(Collectors.toList());
        restTemplate.postForObject(
                toursUrl + "/internal/record-purchases",
                Map.of("touristId", touristId, "tourIds", tourIds),
                Map.class);
    }
}
