package com.example.order.service;

import com.example.order.dto.AuthUser;
import com.example.order.dto.EmailEventPayload;
import com.example.order.dto.EmailTemplates;
import com.example.order.dto.OrderEventPayload;
import com.example.order.model.OrderEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class OrderEventPublisher {

    // Topic gửi đơn mới sang Payment_Service
    private static final String ORDER_CREATED_TOPIC = "order-created";
    // Topic gửi đơn đã thanh toán sang Inventory_Service để trừ kho
    private static final String ORDER_PAID_TOPIC = "order-paid";
    private static final String EMAIL_TOPIC = "send-email-topic-v2";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public OrderEventPublisher(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Publish đơn hàng mới lên topic order-created (gửi sang Payment_Service).
     */
    public void publishOrderCreated(OrderEntity order) {
        OrderEventPayload orderPayload = buildOrderPayload(order);
        kafkaTemplate.send(ORDER_CREATED_TOPIC, order.getProductId(), toJson(orderPayload));
    }

    /**
     * Publish đơn hàng đã thanh toán lên topic order-paid (gửi sang Inventory_Service để trừ kho).
     */
    public void publishOrderPaid(OrderEntity order, AuthUser authUser) {
        OrderEventPayload orderPayload = buildOrderPayload(order);
        kafkaTemplate.send(ORDER_PAID_TOPIC, order.getProductId(), toJson(orderPayload));
        if (authUser != null && authUser.getEmail() != null && !authUser.getEmail().isBlank()) {
            EmailEventPayload emailPayload = new EmailEventPayload();
            emailPayload.setTo(authUser.getEmail());
            emailPayload.setSubject("Thanh toán thành công");
            emailPayload.setContent(
                    EmailTemplates.paymentSuccess(authUser.getEmail(), order.getOrderId(), order.getTotalPrice())
            );
            emailPayload.setOrderId(order.getOrderId());
            kafkaTemplate.send(EMAIL_TOPIC, authUser.getEmail(), toJson(emailPayload));
        }
    }

    private OrderEventPayload buildOrderPayload(OrderEntity order) {
        OrderEventPayload payload = new OrderEventPayload();
        payload.setOrderId(order.getOrderId());
        payload.setUserId(order.getUserId());
        payload.setProductId(order.getProductId());
        payload.setName(order.getProductName());
        payload.setQuantity(order.getQuantity());
        payload.setTotalPrice(order.getTotalPrice());
        payload.setStatus(order.getStatus());
        return payload;
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Khong the serialize payload", ex);
        }
    }
}
