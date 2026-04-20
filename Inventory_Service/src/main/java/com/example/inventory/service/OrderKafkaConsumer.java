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
 * Consumer lắng nghe topic order-paid để trừ tồn kho sau khi thanh toán thành công.
 * Chỉ trừ kho khi đơn hàng đã được thanh toán (status=PAID).
 */
public class OrderKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderKafkaConsumer.class);

    // Lắng nghe topic order-paid 
    private static final String ORDER_PAID_TOPIC = "order-paid";
    private static final String ORDER_STATUS_TOPIC = "order-status";
    private static final String ORDER_GROUP = "kho-db-updater";
    private static final String ORDER_STATUS_PAID = "PAID";
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
     * Nhận event từ topic order-paid (đơn đã được thanh toán).
     * Kiểm tra idempotency, trừ tồn kho, publish kết quả về order-status.
     *
     * Input:
     * - message: chuỗi JSON của OrderEventPayload với status=PAID.
     *
     * Output:
     * - Side effect: giảm stock trong DB khi thỏa điều kiện.
     */
    @KafkaListener(topics = ORDER_PAID_TOPIC, groupId = ORDER_GROUP)
    @Transactional
    public void consumeOrderPaidEvent(String message) {
        String orderIdForError = null;
        try {
            OrderEventPayload event = parseOrderEvent(message);
            orderIdForError = event == null ? null : event.getOrderId();

            if (event == null || !ORDER_STATUS_PAID.equals(event.getStatus())) {
                log.debug("Bỏ qua event không hợp lệ hoặc không phải PAID");
                return;
            }
            if (event.getProductId() == null || event.getProductId().isBlank() || event.getQuantity() <= 0) {
                log.warn("Event orderId={} thiếu productId hoặc quantity không hợp lệ", event.getOrderId());
                return;
            }

            EventIdempotencyService.IdempotencySession session = eventIdempotencyService.open(event.getOrderId());
            if (!session.canProcess()) {
                log.warn("Event orderId={} đã được xử lý (idempotency), bỏ qua.", event.getOrderId());
                return;
            }

            try {
                int updatedRows = productRepository.applyReservedStock(event.getProductId(), event.getQuantity());
                if (updatedRows > 0) {
                    eventIdempotencyService.markProcessed(session);
                    publishStatusEvent(event.getOrderId(), ORDER_STATUS_CONFIRMED, "Đã trừ kho thành công");
                    log.info("Đã trừ kho cho orderId={}, productId={}, qty={}", event.getOrderId(), event.getProductId(), event.getQuantity());
                } else {
                    publishStatusEvent(event.getOrderId(), ORDER_STATUS_FAILED_UPDATE, "Không tìm thấy sản phẩm để đồng bộ kho");
                    log.warn("Không tìm thấy product để trừ kho cho orderId={}", event.getOrderId());
                }
            } finally {
                eventIdempotencyService.close(session);
            }
        } catch (Exception ex) {
            log.error("Lỗi xử lý order-paid event: {}", ex.getMessage(), ex);
            publishStatusEvent(orderIdForError, ORDER_STATUS_FAILED_UPDATE, "Lỗi xử lý tồn kho");
        }
    }

    private OrderEventPayload parseOrderEvent(String message) throws Exception {
        return objectMapper.readValue(message, OrderEventPayload.class);
    }

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