package com.microtourist.purchase.saga;

import com.microtourist.purchase.model.OrderItem;
import com.microtourist.purchase.model.ShoppingCart;
import com.microtourist.purchase.model.TourPurchaseToken;
import com.microtourist.purchase.repository.ShoppingCartRepository;
import com.microtourist.purchase.repository.TourPurchaseTokenRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Executes SAGA steps in isolated REQUIRES_NEW transactions so each step
 * commits independently — enabling explicit compensation when a later step fails.
 */
@Component
public class PurchaseSagaHelper {

    private final ShoppingCartRepository cartRepo;
    private final TourPurchaseTokenRepository tokenRepo;

    public PurchaseSagaHelper(ShoppingCartRepository cartRepo, TourPurchaseTokenRepository tokenRepo) {
        this.cartRepo = cartRepo;
        this.tokenRepo = tokenRepo;
    }

    /** SAGA Step 2: commit purchase tokens and clear the cart. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<TourPurchaseToken> commitCheckout(Long touristId, List<CartItemSnapshot> items) {
        List<TourPurchaseToken> tokens = new ArrayList<>();
        for (CartItemSnapshot item : items) {
            TourPurchaseToken t = new TourPurchaseToken();
            t.setTouristId(touristId);
            t.setTourId(item.tourId());
            t.setTourName(item.tourName());
            t.setPrice(item.price());
            t.setPurchasedAt(LocalDateTime.now());
            tokens.add(t);
        }
        List<TourPurchaseToken> saved = tokenRepo.saveAll(tokens);

        ShoppingCart cart = cartRepo.findByTouristId(touristId)
                .orElseThrow(() -> new RuntimeException("Cart not found"));
        cart.getItems().clear();
        cart.setTotalPrice(0);
        cartRepo.save(cart);

        return saved;
    }

    /** SAGA Compensation C2: delete committed tokens and restore cart items. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void compensateCheckout(Long touristId, List<TourPurchaseToken> tokens, List<CartItemSnapshot> items) {
        tokenRepo.deleteAll(tokens);

        ShoppingCart cart = cartRepo.findByTouristId(touristId).orElseGet(() -> {
            ShoppingCart c = new ShoppingCart();
            c.setTouristId(touristId);
            return cartRepo.save(c);
        });

        for (CartItemSnapshot snap : items) {
            OrderItem item = new OrderItem();
            item.setCart(cart);
            item.setTourId(snap.tourId());
            item.setTourName(snap.tourName());
            item.setPrice(snap.price());
            cart.getItems().add(item);
        }
        cart.setTotalPrice(items.stream().mapToDouble(CartItemSnapshot::price).sum());
        cartRepo.save(cart);
    }

    public record CartItemSnapshot(String tourId, String tourName, double price) {}
}
