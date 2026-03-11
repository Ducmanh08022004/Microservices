package com.example.servicekho.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
public class EventIdempotencyService {

    private static final String PROCESSING_KEY_PREFIX = "event:processing:";
    private static final String PROCESSED_KEY_PREFIX = "event:processed:";
    private static final Duration PROCESSING_LOCK_TTL = Duration.ofMinutes(5);
    private static final Duration PROCESSED_EVENT_TTL = Duration.ofDays(7);

    private final StringRedisTemplate redisTemplate;

    public EventIdempotencyService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    public IdempotencySession open(String eventId) {
        if (eventId == null || eventId.isBlank()) {
            return IdempotencySession.noop();
        }

        String processedKey = processedKey(eventId);
        Boolean alreadyProcessed = redisTemplate.hasKey(processedKey);
        if (Boolean.TRUE.equals(alreadyProcessed)) {
            return IdempotencySession.skip();
        }

        String processingKey = processingKey(eventId);
        Boolean lockAcquired = redisTemplate.opsForValue().setIfAbsent(processingKey, "1", PROCESSING_LOCK_TTL);
        if (!Boolean.TRUE.equals(lockAcquired)) {
            return IdempotencySession.skip();
        }

        return IdempotencySession.active(processingKey, processedKey);
    }

    public void markProcessed(IdempotencySession session) {
        if (session == null || session.processedKey() == null) {
            return;
        }

        redisTemplate.opsForValue().set(session.processedKey(), "1", PROCESSED_EVENT_TTL);
    }

    public void close(IdempotencySession session) {
        if (session == null || session.processingKey() == null) {
            return;
        }

        redisTemplate.delete(session.processingKey());
    }

    private String processingKey(String eventId) {
        return PROCESSING_KEY_PREFIX + eventId;
    }

    private String processedKey(String eventId) {
        return PROCESSED_KEY_PREFIX + eventId;
    }

    public record IdempotencySession(boolean canProcess, String processingKey, String processedKey) {
        private static IdempotencySession noop() {
            return new IdempotencySession(true, null, null);
        }

        private static IdempotencySession active(String processingKey, String processedKey) {
            return new IdempotencySession(true, processingKey, processedKey);
        }

        private static IdempotencySession skip() {
            return new IdempotencySession(false, null, null);
        }
    }
}