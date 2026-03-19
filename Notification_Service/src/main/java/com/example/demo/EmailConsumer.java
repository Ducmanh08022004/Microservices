package com.example.demo;

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
 */
public class EmailConsumer {

    private final EmailService emailService;

    /**
     * Xử lý message từ topic send-email-topic-v2.
     *
     * Input:
     * - event: payload email gồm to/subject/content/orderId.
     * - ack: đối tượng ack thủ công của Kafka.
     *
     * Output:
     * - Không trả về giá trị.
     * - Side effect: gửi email và acknowledge message khi thành công.
     */
    @KafkaListener(topics = "send-email-topic-v2")
    public void consume(EmailEvent event, Acknowledgment ack) {
        try {
            emailService.sendEmail(event.getTo(), event.getSubject(), event.getContent());
            ack.acknowledge();
            log.info("Email sent successfully to: {}, orderId: {}", event.getTo(), event.getOrderId());
        } catch (Exception e) {
            log.error("Failed to send email to {}, orderId: {}: {}", event.getTo(), event.getOrderId(), e.getMessage());
        }
    }
}
