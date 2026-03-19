package com.example.inventory.service;

import com.example.inventory.dto.OrderEventPayload;
import com.example.inventory.dto.OrderStatusEventPayload;
import com.example.inventory.repository.ProductRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
/**
 * Consumer lắng nghe topic order để trừ tồn kho trong DB.
 */
public class OrderKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderKafkaConsumer.class);

    private static final String ORDER_TOPIC = "order";
    private static final String ORDER_STATUS_TOPIC = "order-status";
    private static final String ORDER_GROUP = "kho-db-updater";
    private static final String ORDER_STATUS_PENDING_UPDATE = "PENDING_UPDATE";
    private static final String ORDER_STATUS_CONFIRMED = "CONFIRMED";
    private static final String ORDER_STATUS_FAILED_UPDATE = "FAILED_UPDATE";

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;
    private final EventIdempotencyService eventIdempotencyService;
    private final KafkaTemplate<String, String> kafkaTemplate;

    public OrderKafkaConsumer(
            ProductRepository productRepository,
            ObjectMapper objectMapper,
            EventIdempotencyService eventIdempotencyService,
            KafkaTemplate<String, String> kafkaTemplate
    ) {
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
        this.eventIdempotencyService = eventIdempotencyService;
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Nhận message từ Kafka, kiểm tra hợp lệ, khóa idempotency và cập nhật stock DB.
     *
     * Input:
     * - message: chuỗi JSON của OrderEventPayload.
     *
     * Output:
     * - Không trả về giá trị; side effect là giảm stock trong DB khi thỏa điều kiện.
     */
    @KafkaListener(topics = ORDER_TOPIC, groupId = ORDER_GROUP)
    @Transactional
    public void consumeOrderEvent(String message) {
        String orderIdForError = null;
        try {
            OrderEventPayload event = parseOrderEvent(message);
            orderIdForError = event == null ? null : event.getOrderId();

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
                int updatedRows = productRepository.applyReservedStock(event.getProductId(), event.getQuantity());
                if (updatedRows > 0) {
                    eventIdempotencyService.markProcessed(session);
                    publishStatusEvent(event.getOrderId(), ORDER_STATUS_CONFIRMED, "Đã trừ kho thành công");
                } else {
                    publishStatusEvent(event.getOrderId(), ORDER_STATUS_FAILED_UPDATE, "Không tìm thấy sản phẩm để đồng bộ kho");
                }
            } finally {
                eventIdempotencyService.close(session);
            }
        } catch (Exception ex) {
            log.error("Lỗi xử lý order event: {}", ex.getMessage(), ex);
            publishStatusEvent(orderIdForError, ORDER_STATUS_FAILED_UPDATE, "Lỗi xử lý tồn kho");
        }
    }

    /**
     * Parse JSON message thành OrderEventPayload.
     */
    private OrderEventPayload parseOrderEvent(String message) throws Exception {
        return objectMapper.readValue(message, OrderEventPayload.class);
    }

    /**
     * Gửi event trạng thái đơn để Order_Service cập nhật trạng thái cuối cùng.
     */
    private void publishStatusEvent(String orderId, String status, String message) {
        try {
            if (orderId == null || orderId.isBlank()) {
                return;
            }

            OrderStatusEventPayload payload = new OrderStatusEventPayload();
            payload.setOrderId(orderId);
            payload.setStatus(status);
            payload.setMessage(message);

            kafkaTemplate.send(ORDER_STATUS_TOPIC, orderId, objectMapper.writeValueAsString(payload)).get();
            log.info("Đã publish order-status cho orderId={}, status={}", orderId, status);
        } catch (Exception ex) {
            log.error("Không publish được order-status cho orderId={}: {}", orderId, ex.getMessage(), ex);
        }
    }
}