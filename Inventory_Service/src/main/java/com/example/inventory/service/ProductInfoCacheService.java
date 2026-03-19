package com.example.inventory.service;

import com.example.inventory.dto.ProductInfoCache;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;

@Service
/**
 * Service thao tác cache thông tin sản phẩm (name, price) trên Redis.
 */
public class ProductInfoCacheService {

    private static final String INFO_KEY_PREFIX = "info:";

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    public ProductInfoCacheService(StringRedisTemplate redisTemplate, ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Đọc thông tin sản phẩm từ cache theo productId.
     *
     * Input:
     * - productId: mã sản phẩm.
     *
     * Output:
     * - Optional<ProductInfoCache>: rỗng nếu không có cache.
     */
    public Optional<ProductInfoCache> get(String productId) {
        String cachedInfo = redisTemplate.opsForValue().get(infoKey(productId));
        if (cachedInfo == null) {
            return Optional.empty();
        }

        try {
            return Optional.of(objectMapper.readValue(cachedInfo, ProductInfoCache.class));
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Du lieu info cache khong hop le", ex);
        }
    }

    /**
     * Ghi thông tin sản phẩm vào cache với TTL.
     *
     * Input:
     * - productId: mã sản phẩm.
     * - name: tên sản phẩm.
     * - price: đơn giá.
     * - ttl: thời gian sống của key cache.
     *
     * Output:
     * - Không trả về giá trị; side effect là ghi Redis key info:{productId}.
     */
    public void set(String productId, String name, Double price, Duration ttl) {
        try {
            String value = objectMapper.writeValueAsString(new ProductInfoCache(name, price));
            redisTemplate.opsForValue().set(infoKey(productId), value, ttl);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Khong the ghi cache product info", ex);
        }
    }

    private String infoKey(String productId) {
        return INFO_KEY_PREFIX + productId;
    }
}