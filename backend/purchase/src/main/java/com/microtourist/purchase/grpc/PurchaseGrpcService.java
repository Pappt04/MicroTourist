package com.microtourist.purchase.grpc;

import com.microtourist.purchase.model.OrderItem;
import com.microtourist.purchase.model.ShoppingCart;
import com.microtourist.purchase.service.PurchaseService;
import io.grpc.stub.StreamObserver;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PurchaseGrpcService extends PurchaseServiceGrpc.PurchaseServiceImplBase {

    private final PurchaseService purchaseService;

    public PurchaseGrpcService(PurchaseService purchaseService) {
        this.purchaseService = purchaseService;
    }

    @Override
    public void getCart(GetCartRequest request, StreamObserver<GetCartResponse> responseObserver) {
        ShoppingCart cart = purchaseService.getCart(request.getTouristId());

        GetCartResponse.Builder builder = GetCartResponse.newBuilder()
                .setId(cart.getId() != null ? cart.getId() : 0)
                .setTouristId(cart.getTouristId() != null ? cart.getTouristId() : 0)
                .setTotalPrice(cart.getTotalPrice());

        for (OrderItem item : cart.getItems()) {
            builder.addItems(OrderItemMsg.newBuilder()
                    .setId(item.getId() != null ? item.getId() : 0)
                    .setTourId(item.getTourId() != null ? item.getTourId() : "")
                    .setTourName(item.getTourName() != null ? item.getTourName() : "")
                    .setPrice(item.getPrice())
                    .build());
        }

        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void getPurchases(GetPurchasesRequest request, StreamObserver<GetPurchasesResponse> responseObserver) {
        List<String> tourIds = purchaseService.getPurchasedTourIds(request.getTouristId());

        responseObserver.onNext(GetPurchasesResponse.newBuilder()
                .addAllTourIds(tourIds)
                .build());
        responseObserver.onCompleted();
    }
}
