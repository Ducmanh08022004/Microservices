package com.example.demo;

import lombok.RequiredArgsConstructor;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationEmailPublisher {

    private static final String TOPIC = "send-email-topic-v2";

    private final KafkaTemplate<String, EmailEvent> kafkaTemplate;

    public void send(String to, String subject, String content) {
        kafkaTemplate.send(TOPIC, new EmailEvent(to, subject, content, null));
    }
}