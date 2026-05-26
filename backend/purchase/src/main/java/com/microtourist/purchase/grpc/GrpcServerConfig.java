package com.microtourist.purchase.grpc;

import io.grpc.Server;
import io.grpc.ServerBuilder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GrpcServerConfig {

    private static final Logger log = LoggerFactory.getLogger(GrpcServerConfig.class);

    @Value("${grpc.port:9092}")
    private int grpcPort;

    @Bean
    public ApplicationRunner grpcServer(PurchaseGrpcService purchaseGrpcService) {
        return args -> {
            Server server = ServerBuilder.forPort(grpcPort)
                    .addService(purchaseGrpcService)
                    .build()
                    .start();
            log.info("gRPC server started on port {}", grpcPort);
            Runtime.getRuntime().addShutdownHook(new Thread(server::shutdown));
        };
    }
}
