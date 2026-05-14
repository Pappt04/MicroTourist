package com.microtourist.tours;

import com.microtourist.tours.model.Tour;
import com.microtourist.tours.model.Waypoint;
import com.microtourist.tours.repository.TourRepository;
import com.microtourist.tours.repository.WaypointRepository;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class DataInitializer implements ApplicationRunner {

    private final TourRepository tourRepo;
    private final WaypointRepository waypointRepo;

    public DataInitializer(TourRepository tourRepo, WaypointRepository waypointRepo) {
        this.tourRepo = tourRepo;
        this.waypointRepo = waypointRepo;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!tourRepo.findByStatus("PUBLISHED").isEmpty()) return;

        Tour tour = new Tour();
        tour.setTitle("Belgrade City Walk");
        tour.setDescription("A scenic walk through the heart of Belgrade, covering Kalemegdan fortress, Knez Mihailova street and Skadarlija bohemian quarter.");
        tour.setDifficulty("Easy");
        tour.setTags(List.of("city", "history", "walking"));
        tour.setStatus("PUBLISHED");
        tour.setPrice(0);
        tour.setAuthorId(1L);
        tour = tourRepo.save(tour);

        Waypoint wp1 = new Waypoint();
        wp1.setTourId(tour.getId());
        wp1.setName("Kalemegdan Fortress");
        wp1.setDescription("Ancient fortress overlooking the confluence of the Sava and Danube rivers.");
        wp1.setLatitude(44.8225);
        wp1.setLongitude(20.4503);
        wp1.setOrderIndex(0);

        Waypoint wp2 = new Waypoint();
        wp2.setTourId(tour.getId());
        wp2.setName("Knez Mihailova Street");
        wp2.setDescription("Belgrade's main pedestrian zone lined with shops and 19th century architecture.");
        wp2.setLatitude(44.8178);
        wp2.setLongitude(20.4569);
        wp2.setOrderIndex(1);

        Waypoint wp3 = new Waypoint();
        wp3.setTourId(tour.getId());
        wp3.setName("Skadarlija");
        wp3.setDescription("Belgrade's bohemian quarter with traditional restaurants and cobblestone streets.");
        wp3.setLatitude(44.8167);
        wp3.setLongitude(20.4631);
        wp3.setOrderIndex(2);

        waypointRepo.saveAll(List.of(wp1, wp2, wp3));
    }
}
