package com.example.order.service;

import com.example.order.dto.AuthUser;
import com.example.order.dto.EmailEventPayload;
import com.example.order.dto.OrderEventPayload;
import com.example.order.model.OrderEntity;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class OrderEventPublisher {

    private static final String ORDER_TOPIC = "order";
    private static final String EMAIL_TOPIC = "send-email-topic-v2";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public OrderEventPublisher(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public void publishOrderCreated(OrderEntity order, AuthUser authUser) {
        OrderEventPayload orderPayload = new OrderEventPayload();
        orderPayload.setOrderId(order.getOrderId());
        orderPayload.setUserId(order.getUserId());
        orderPayload.setProductId(order.getProductId());
        orderPayload.setName(order.getProductName());
        orderPayload.setQuantity(order.getQuantity());
        orderPayload.setTotalPrice(order.getTotalPrice());
        orderPayload.setStatus(order.getStatus());

        kafkaTemplate.send(ORDER_TOPIC, order.getProductId(), toJson(orderPayload));

        if (authUser.getEmail() != null && !authUser.getEmail().isBlank()) {
            EmailEventPayload emailPayload = new EmailEventPayload();
            emailPayload.setTo(authUser.getEmail());
            emailPayload.setSubject("gmail xac nhan don");
            emailPayload.setContent("Ten san pham: " + order.getProductName() + ", Tong tien: " + order.getTotalPrice());
            emailPayload.setOrderId(order.getOrderId());
            kafkaTemplate.send(EMAIL_TOPIC, authUser.getEmail(), toJson(emailPayload));
        }
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Khong the serialize payload", ex);
        }
    }
}
