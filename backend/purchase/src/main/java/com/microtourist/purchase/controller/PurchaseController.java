package com.microtourist.purchase.controller;

import com.microtourist.purchase.saga.CheckoutSagaOrchestrator;
import com.microtourist.purchase.service.PurchaseService;
import com.microtourist.purchase.util.TokenUtil;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin("*")
public class PurchaseController {

    private final PurchaseService purchaseService;
    private final CheckoutSagaOrchestrator checkoutSaga;
    private final TokenUtil tokenUtil;

    public PurchaseController(PurchaseService purchaseService,
                               CheckoutSagaOrchestrator checkoutSaga,
                               TokenUtil tokenUtil) {
        this.purchaseService = purchaseService;
        this.checkoutSaga = checkoutSaga;
        this.tokenUtil = tokenUtil;
    }

    private TokenUtil.TokenPayload auth(HttpServletRequest req) {
        String header = req.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) return null;
        return tokenUtil.validateToken(header.substring(7));
    }

    @GetMapping("/cart")
    public ResponseEntity<?> getCart(HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        if (!"tourist".equals(user.role())) return ResponseEntity.status(403).body(Map.of("error", "only tourists can have a cart"));
        return ResponseEntity.ok(purchaseService.getCart(user.userId()));
    }

    @PostMapping("/cart/items")
    public ResponseEntity<?> addItem(@RequestBody Map<String, Object> body, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        if (!"tourist".equals(user.role())) return ResponseEntity.status(403).body(Map.of("error", "only tourists can add to cart"));

        String tourId = (String) body.get("tourId");
        String tourName = (String) body.get("tourName");
        double price = ((Number) body.get("price")).doubleValue();

        try {
            return ResponseEntity.ok(purchaseService.addItem(user.userId(), tourId, tourName, price));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/cart/items/{tourId}")
    public ResponseEntity<?> removeItem(@PathVariable String tourId, HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        return ResponseEntity.ok(purchaseService.removeItem(user.userId(), tourId));
    }

    /** SAGA-based checkout: validates tours, commits locally, notifies Tours service. */
    @PostMapping("/cart/checkout")
    public ResponseEntity<?> checkout(HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        if (!"tourist".equals(user.role())) return ResponseEntity.status(403).body(Map.of("error", "only tourists can checkout"));

        try {
            return ResponseEntity.ok(checkoutSaga.execute(user.userId()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/purchases")
    public ResponseEntity<?> getPurchases(HttpServletRequest req) {
        TokenUtil.TokenPayload user = auth(req);
        if (user == null) return ResponseEntity.status(401).body(Map.of("error", "authentication required"));
        return ResponseEntity.ok(purchaseService.getPurchasedTourIds(user.userId()));
    }

    /**
     * Internal endpoint — called by Tour Archive SAGA to remove an archived tour
     * from all active shopping carts.
     */
    @DeleteMapping("/internal/carts/tour/{tourId}")
    public ResponseEntity<?> removeTourFromAllCarts(@PathVariable String tourId) {
        purchaseService.removeTourFromAllCarts(tourId);
        return ResponseEntity.ok(Map.of("message", "tour removed from all carts"));
    }

    /** Internal endpoint — called by Tours service to verify a tourist has purchased a tour. */
    @GetMapping("/internal/purchases/check")
    public ResponseEntity<?> checkPurchase(@org.springframework.web.bind.annotation.RequestParam Long touristId,
                                           @org.springframework.web.bind.annotation.RequestParam String tourId) {
        return ResponseEntity.ok(Map.of("purchased", purchaseService.isPurchased(touristId, tourId)));
    }
}
