package com.example.demo;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
/**
 * Consumer nhận sự kiện email từ Kafka và gọi service gửi mail.
 * Nhận payload dạng JSON String rồi tự parse thành EmailEvent
 * để tương thích với cả Order_Service (StringSerializer) và Auth_Service (JsonSerializer).
 */
public class EmailConsumer {

    private final EmailService emailService;
    private final ObjectMapper objectMapper;

    /**
     * Xử lý message từ topic send-email-topic-v2.
     * Nhận String thô từ Kafka rồi parse thủ công thành EmailEvent.
     */
    @KafkaListener(topics = "send-email-topic-v2")
    public void consume(String payload, Acknowledgment ack) {
        EmailEvent event = null;
        try {
            event = objectMapper.readValue(payload, EmailEvent.class);
        } catch (Exception e) {
            log.error("Failed to parse email event payload: {}. Raw: {}", e.getMessage(), payload);
            ack.acknowledge(); // Acknowledge để tránh retry vô hạn với message lỗi format
            return;
        }

        // Guard: không gửi nếu địa chỉ email rỗng hoặc null
        if (event.getTo() == null || event.getTo().isBlank()) {
            log.warn("Skipped email with empty/null recipient. orderId: {}", event.getOrderId());
            ack.acknowledge();
            return;
        }

        try {
            emailService.sendEmail(event.getTo(), event.getSubject(), event.getContent());
            ack.acknowledge();
            log.info("Email sent successfully to: {}, orderId: {}", event.getTo(), event.getOrderId());
        } catch (Exception e) {
            log.error("Failed to send email to {}, orderId: {}: {}", event.getTo(), event.getOrderId(), e.getMessage());
        }
    }
}
