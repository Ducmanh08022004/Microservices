package com.example.order.service;

import com.example.order.dto.OrderStatusEventPayload;
import com.example.order.model.OrderEntity;
import com.example.order.repository.OrderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
/**
 * Consumer nhận trạng thái xử lý từ Inventory để cập nhật order_db.
 */
public class OrderStatusEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderStatusEventConsumer.class);

    private static final String ORDER_STATUS_TOPIC = "order-status";
    private static final String ORDER_STATUS_GROUP = "order-status-updater";

    private final ObjectMapper objectMapper;
    private final OrderRepository orderRepository;

    public OrderStatusEventConsumer(ObjectMapper objectMapper, OrderRepository orderRepository) {
        this.objectMapper = objectMapper;
        this.orderRepository = orderRepository;
    }

    /**
     * Input: message JSON của OrderStatusEventPayload từ topic order-status.
     * Output: cập nhật trường status của đơn hàng tương ứng trong DB.
     */
    @KafkaListener(topics = ORDER_STATUS_TOPIC, groupId = ORDER_STATUS_GROUP)
    public void consumeOrderStatusEvent(String message) {
        try {
            OrderStatusEventPayload event = objectMapper.readValue(message, OrderStatusEventPayload.class);
            if (event == null || event.getOrderId() == null || event.getOrderId().isBlank()) {
                return;
            }
            if (event.getStatus() == null || event.getStatus().isBlank()) {
                return;
            }

            Optional<OrderEntity> orderOptional = orderRepository.findByOrderId(event.getOrderId());
            if (orderOptional.isEmpty()) {
                log.warn("Không tìm thấy orderId={} để cập nhật status={}", event.getOrderId(), event.getStatus());
                return;
            }

            OrderEntity order = orderOptional.get();
            if (!event.getStatus().equals(order.getStatus())) {
                order.setStatus(event.getStatus());
                orderRepository.save(order);
                log.info("Đã cập nhật orderId={} sang status={}", event.getOrderId(), event.getStatus());
            }
        } catch (Exception ex) {
            log.error("Lỗi cập nhật status đơn hàng: {}", ex.getMessage(), ex);
        }
    }
}