package com.example.demo;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailConsumer {

    private final EmailService emailService;

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
