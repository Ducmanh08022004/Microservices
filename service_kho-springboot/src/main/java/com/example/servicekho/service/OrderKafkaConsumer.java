package com.example.servicekho.service;

import com.example.servicekho.dto.OrderEventPayload;
import com.example.servicekho.repository.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

@Service
public class OrderKafkaConsumer {

    private static final String ORDER_TOPIC = "order";
    private static final String ORDER_GROUP = "kho-db-updater";
    private static final String ORDER_STATUS_PENDING_UPDATE = "PENDING_UPDATE";

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;
    private final EventIdempotencyService eventIdempotencyService;

    public OrderKafkaConsumer(
            ProductRepository productRepository,
            ObjectMapper objectMapper,
            EventIdempotencyService eventIdempotencyService
    ) {
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
        this.eventIdempotencyService = eventIdempotencyService;
    }

    @KafkaListener(topics = ORDER_TOPIC, groupId = ORDER_GROUP)
    public void consumeOrderEvent(String message) {
        try {
            OrderEventPayload event = parseOrderEvent(message);
            if (event == null || !ORDER_STATUS_PENDING_UPDATE.equals(event.getStatus())) {
                return;
            }
            if (event.getProductId() == null || event.getProductId().isBlank() || event.getQuantity() <= 0) {
                return;
            }

            EventIdempotencyService.IdempotencySession session = eventIdempotencyService.open(event.getOrderId());
            if (!session.canProcess()) {
                return;
            }

            try {
                int updatedRows = productRepository.decrementStockIfEnough(event.getProductId(), event.getQuantity());
                if (updatedRows > 0) {
                    eventIdempotencyService.markProcessed(session);
                }
            } finally {
                eventIdempotencyService.close(session);
            }
        } catch (Exception ignored) { 
        }
    }

    private OrderEventPayload parseOrderEvent(String message) throws Exception {
        return objectMapper.readValue(message, OrderEventPayload.class);
    }
}