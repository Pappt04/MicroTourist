package com.microtourist.tours.grpc;

import com.microtourist.tours.model.Tour;
import com.microtourist.tours.model.TransportTime;
import com.microtourist.tours.service.TourService;
import io.grpc.stub.StreamObserver;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
public class TourGrpcService extends ToursServiceGrpc.ToursServiceImplBase {

    private final TourService tourService;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    public TourGrpcService(TourService tourService) {
        this.tourService = tourService;
    }

    @Override
    public void getPublishedTours(Empty request, StreamObserver<TourListResponse> responseObserver) {
        List<Tour> tours = tourService.getPublished();
        TourListResponse.Builder builder = TourListResponse.newBuilder();
        for (Tour t : tours) {
            builder.addTours(toMessage(t));
        }
        responseObserver.onNext(builder.build());
        responseObserver.onCompleted();
    }

    @Override
    public void getTourById(TourByIdRequest request, StreamObserver<TourResponse> responseObserver) {
        try {
            Tour t = tourService.getById(request.getId());
            responseObserver.onNext(TourResponse.newBuilder().setTour(toMessage(t)).build());
        } catch (RuntimeException e) {
            responseObserver.onNext(TourResponse.newBuilder().setError(e.getMessage()).build());
        }
        responseObserver.onCompleted();
    }

    private TourMessage toMessage(Tour t) {
        TourMessage.Builder b = TourMessage.newBuilder()
                .setId(t.getId())
                .setTitle(orEmpty(t.getTitle()))
                .setDescription(orEmpty(t.getDescription()))
                .setDifficulty(orEmpty(t.getDifficulty()))
                .setStatus(orEmpty(t.getStatus()))
                .setPrice(t.getPrice())
                .setAuthorId(t.getAuthorId() != null ? t.getAuthorId() : 0)
                .setLengthKm(t.getLengthKm())
                .setPurchaseCount(t.getPurchaseCount())
                .setCreatedAt(t.getCreatedAt() != null ? t.getCreatedAt().format(FMT) : "");

        if (t.getTags() != null) b.addAllTags(t.getTags());
        if (t.getTransportTimes() != null) {
            for (TransportTime tt : t.getTransportTimes()) {
                b.addTransportTimes(TransportTimeMsg.newBuilder()
                        .setTransport(orEmpty(tt.getTransport()))
                        .setMinutes(tt.getMinutes())
                        .build());
            }
        }
        if (t.getPublishedAt() != null) b.setPublishedAt(t.getPublishedAt().format(FMT));
        if (t.getArchivedAt() != null) b.setArchivedAt(t.getArchivedAt().format(FMT));

        return b.build();
    }

    private String orEmpty(String s) { return s != null ? s : ""; }
}
