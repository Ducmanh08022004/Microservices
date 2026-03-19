package com.example.inventory.service;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Collections;

@Service
/**
 * Service quản lý reserve stock theo cơ chế atomic trên Redis bằng Lua script.
 */
public class StockReservationService {

    private static final String STOCK_KEY_PREFIX = "stock:";
    private static final long RESERVE_RESULT_NOT_ENOUGH = -1L;
    private static final RedisScript<Long> RESERVE_STOCK_SCRIPT = new DefaultRedisScript<>(
            """
            local current = redis.call('GET', KEYS[1])
            if not current then
                return -2
            end
            current = tonumber(current)
            local qty = tonumber(ARGV[1])
            if current < qty then
                return -1
            end
            return redis.call('DECRBY', KEYS[1], qty)
            """,
            Long.class
    );

    private final StringRedisTemplate redisTemplate;

    public StockReservationService(StringRedisTemplate redisTemplate) {
        this.redisTemplate = redisTemplate;
    }

    /**
     * Ghi đè stock vào Redis key stock:{productId} với TTL.
     */
    public void setStock(String productId, int stock, Duration ttl) {
        redisTemplate.opsForValue().set(stockKey(productId), String.valueOf(stock), ttl);
    }

    /**
     * Chỉ set stock nếu key chưa tồn tại.
     */
    public void setStockIfAbsent(String productId, int stock, Duration ttl) {
        redisTemplate.opsForValue().setIfAbsent(stockKey(productId), String.valueOf(stock), ttl);
    }

    /**
     * Trừ stock theo quantity trên Redis.
     *
     * Output:
     * - SUCCESS: trừ thành công.
     * - NOT_ENOUGH: không đủ hàng.
     * - CACHE_MISS: chưa có key stock trong cache.
     * - ERROR: lỗi thực thi script.
     */
    public ReservationResult reserve(String productId, int quantity) {
        Long result = redisTemplate.execute(
                RESERVE_STOCK_SCRIPT,
                Collections.singletonList(stockKey(productId)),
                String.valueOf(quantity)
        );

        if (result == null) {
            return ReservationResult.ERROR;
        }
        if (result >= 0) {
            return ReservationResult.SUCCESS;
        }
        if (result == RESERVE_RESULT_NOT_ENOUGH) {
            return ReservationResult.NOT_ENOUGH;
        }
        return ReservationResult.CACHE_MISS;
    }

    /**
     * Đọc số lượng tồn hiện tại trong Redis cache.
     *
     * Output:
     * - Số lượng tồn nếu key hợp lệ.
     * - null nếu cache miss hoặc dữ liệu không parse được.
     */
    public Integer getAvailableStock(String productId) {
        String value = redisTemplate.opsForValue().get(stockKey(productId));
        if (value == null) {
            return null;
        }
        try {
            return Integer.parseInt(value);
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private String stockKey(String productId) {
        return STOCK_KEY_PREFIX + productId;
    }

    public enum ReservationResult {
        SUCCESS,
        NOT_ENOUGH,
        CACHE_MISS,
        ERROR
    }
}