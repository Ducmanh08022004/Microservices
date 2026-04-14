package com.example.payment.service;

import com.example.payment.dto.PaymentResultEventPayload;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
public class PaymentEventPublisher {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventPublisher.class);
    private static final String PAYMENT_RESULT_TOPIC = "payment-result";

    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public PaymentEventPublisher(KafkaTemplate<String, String> kafkaTemplate, ObjectMapper objectMapper) {
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Publish kết quả thanh toán lên topic payment-result.
     * Order_Service sẽ consume và cập nhật trạng thái đơn hàng.
     */
    public void publishPaymentResult(String orderId, String status, String message) {
        try {
            PaymentResultEventPayload payload = new PaymentResultEventPayload();
            payload.setOrderId(orderId);
            payload.setStatus(status);
            payload.setMessage(message);

            String json = objectMapper.writeValueAsString(payload);
            kafkaTemplate.send(PAYMENT_RESULT_TOPIC, orderId, json);
            log.info("Đã publish payment-result orderId={}, status={}", orderId, status);
        } catch (JsonProcessingException ex) {
            log.error("Không thể serialize payment-result cho orderId={}: {}", orderId, ex.getMessage());
        }
    }
}
