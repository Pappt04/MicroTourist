package com.microtourist.purchase.service;

import com.microtourist.purchase.model.OrderItem;
import com.microtourist.purchase.model.ShoppingCart;
import com.microtourist.purchase.model.TourPurchaseToken;
import com.microtourist.purchase.repository.ShoppingCartRepository;
import com.microtourist.purchase.repository.TourPurchaseTokenRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class PurchaseService {

    private final ShoppingCartRepository cartRepo;
    private final TourPurchaseTokenRepository tokenRepo;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${tours.service.url:http://localhost:8084}")
    private String toursServiceUrl;

    public PurchaseService(ShoppingCartRepository cartRepo, TourPurchaseTokenRepository tokenRepo) {
        this.cartRepo = cartRepo;
        this.tokenRepo = tokenRepo;
    }

    private ShoppingCart getOrCreate(Long touristId) {
        return cartRepo.findByTouristId(touristId).orElseGet(() -> {
            ShoppingCart cart = new ShoppingCart();
            cart.setTouristId(touristId);
            return cartRepo.save(cart);
        });
    }

    public ShoppingCart getCart(Long touristId) {
        return getOrCreate(touristId);
    }

    @Transactional
    public ShoppingCart addItem(Long touristId, String tourId, String tourName, double price) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> tour = restTemplate.getForObject(toursServiceUrl + "/tours/" + tourId, Map.class);
            if (tour != null && "ARCHIVED".equals(tour.get("status"))) {
                throw new RuntimeException("Archived tours cannot be purchased");
            }
        } catch (RuntimeException e) {
            if (e.getMessage() != null && e.getMessage().contains("Archived")) throw e;
            // tours service unreachable — proceed
        }

        if (tokenRepo.existsByTouristIdAndTourId(touristId, tourId)) {
            throw new RuntimeException("Tour already purchased");
        }

        ShoppingCart cart = getOrCreate(touristId);

        boolean alreadyInCart = cart.getItems().stream()
                .anyMatch(i -> i.getTourId().equals(tourId));
        if (alreadyInCart) {
            throw new RuntimeException("Tour already in cart");
        }

        OrderItem item = new OrderItem();
        item.setCart(cart);
        item.setTourId(tourId);
        item.setTourName(tourName);
        item.setPrice(price);
        cart.getItems().add(item);
        cart.setTotalPrice(cart.getItems().stream().mapToDouble(OrderItem::getPrice).sum());
        return cartRepo.save(cart);
    }

    @Transactional
    public ShoppingCart removeItem(Long touristId, String tourId) {
        ShoppingCart cart = getOrCreate(touristId);
        cart.getItems().removeIf(i -> i.getTourId().equals(tourId));
        cart.setTotalPrice(cart.getItems().stream().mapToDouble(OrderItem::getPrice).sum());
        return cartRepo.save(cart);
    }

    @Transactional
    public List<TourPurchaseToken> checkout(Long touristId) {
        ShoppingCart cart = getOrCreate(touristId);
        if (cart.getItems().isEmpty()) {
            throw new RuntimeException("Cart is empty");
        }

        List<TourPurchaseToken> tokens = cart.getItems().stream().map(item -> {
            TourPurchaseToken t = new TourPurchaseToken();
            t.setTouristId(touristId);
            t.setTourId(item.getTourId());
            t.setTourName(item.getTourName());
            t.setPrice(item.getPrice());
            t.setPurchasedAt(LocalDateTime.now());
            return t;
        }).collect(Collectors.toList());

        List<TourPurchaseToken> saved = tokenRepo.saveAll(tokens);

        cart.getItems().clear();
        cart.setTotalPrice(0);
        cartRepo.save(cart);

        return saved;
    }

    public List<String> getPurchasedTourIds(Long touristId) {
        return tokenRepo.findByTouristId(touristId).stream()
                .map(TourPurchaseToken::getTourId)
                .collect(Collectors.toList());
    }
}
