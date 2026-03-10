package com.example.servicekho.service;

import com.example.servicekho.dto.*;
import com.example.servicekho.model.Product;
import com.example.servicekho.repository.ProductRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ProductService {

    private static final String ORDER_TOPIC = "order";
    private static final String EMAIL_TOPIC = "send-email-topic-v2";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final ProductRepository productRepository;
    private final StringRedisTemplate redisTemplate;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public ProductService(
            ProductRepository productRepository,
            StringRedisTemplate redisTemplate,
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper
    ) {
        this.productRepository = productRepository;
        this.redisTemplate = redisTemplate;
        this.kafkaTemplate = kafkaTemplate;
        this.objectMapper = objectMapper;
    }

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Optional<Product> getByProductId(String productId) {
        return productRepository.findByProductId(productId);
    }

    public Product createProduct(CreateProductRequest request) {
        Product product = new Product();
        product.setProductId(request.getProductId());
        product.setName(request.getName());
        product.setStock(request.getStock() == null ? 0 : request.getStock());
        product.setPrice(request.getPrice() == null ? 0D : request.getPrice());
        product.setCreatedAt(LocalDateTime.now());
        return productRepository.save(product);
    }

    public Optional<Product> updateStock(String productId, Integer stock) {
        Optional<Product> optionalProduct = productRepository.findByProductId(productId);
        if (optionalProduct.isEmpty()) {
            return Optional.empty();
        }

        Product product = optionalProduct.get();
        product.setStock(stock);
        Product updated = productRepository.save(product);

        String stockKey = stockKey(productId);
        redisTemplate.opsForValue().set(stockKey, String.valueOf(stock), CACHE_TTL);
        return Optional.of(updated);
    }

    public CheckStockResponse checkStock(CheckStockRequest request, AuthUser authUser) {
        if (request.getProductId() == null || request.getProductId().isBlank() || request.getQuantity() == null || request.getQuantity() <= 0) {
            return new CheckStockResponse(false, "Dữ liệu kiểm tra kho không hợp lệ");
        }

        String productId = request.getProductId();
        int qty = request.getQuantity();

        String stockKey = stockKey(productId);
        String infoKey = infoKey(productId);

        String cachedStock = redisTemplate.opsForValue().get(stockKey);
        String cachedInfo = redisTemplate.opsForValue().get(infoKey);

        if (cachedStock != null && cachedInfo != null) {
            int stockInt = Integer.parseInt(cachedStock);
            if (stockInt >= qty) {
                redisTemplate.opsForValue().decrement(stockKey, qty);
                ProductInfoCache info = readProductInfoCache(cachedInfo);
                double totalPrice = info.getPrice() * qty;

                publishOrderAndEmail(authUser, productId, info.getName(), qty, totalPrice);
                return new CheckStockResponse(true, "Đã giữ chỗ thành công (Redis)");
            }
            return new CheckStockResponse(false, "Hết hàng rồi (Redis)");
        }

        Optional<Product> optionalProduct = productRepository.findByProductId(productId);
        if (optionalProduct.isEmpty()) {
            return new CheckStockResponse(false, "Không tìm thấy sản phẩm");
        }

        Product product = optionalProduct.get();
        if (product.getStock() >= qty) {
            int remainingStock = product.getStock() - qty;
            double totalPrice = product.getPrice() * qty;

            redisTemplate.opsForValue().set(stockKey, String.valueOf(remainingStock), CACHE_TTL);
            writeProductInfoCache(infoKey, product.getName(), product.getPrice());

            publishOrderAndEmail(authUser, productId, product.getName(), qty, totalPrice);
            return new CheckStockResponse(true, "Đã giữ chỗ thành công (DB)");
        }

        return new CheckStockResponse(false, "Kho không đủ hàng (DB)");
    }

    private void publishOrderAndEmail(AuthUser authUser, String productId, String name, int quantity, double totalPrice) {
        Map<String, Object> orderPayload = new HashMap<>();
        orderPayload.put("userId", authUser.getId());
        orderPayload.put("productId", productId);
        orderPayload.put("name", name);
        orderPayload.put("quantity", quantity);
        orderPayload.put("totalPrice", totalPrice);
        orderPayload.put("status", "PENDING_UPDATE");

        Map<String, Object> emailPayload = new HashMap<>();
        emailPayload.put("to", authUser.getEmail());
        emailPayload.put("subject", "gmail xac nhan don");
        emailPayload.put("content", "Ten san pham: " + name + ", Tong tien: " + totalPrice);

        kafkaTemplate.send(ORDER_TOPIC, toJson(orderPayload));
        if (authUser.getEmail() != null && !authUser.getEmail().isBlank()) {
            kafkaTemplate.send(EMAIL_TOPIC, toJson(emailPayload));
        }
    }

    private ProductInfoCache readProductInfoCache(String cachedInfo) {
        try {
            return objectMapper.readValue(cachedInfo, ProductInfoCache.class);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Du lieu info cache khong hop le", ex);
        }
    }

    private void writeProductInfoCache(String infoKey, String name, Double price) {
        try {
            String value = objectMapper.writeValueAsString(new ProductInfoCache(name, price));
            redisTemplate.opsForValue().set(infoKey, value, CACHE_TTL);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Khong the ghi cache product info", ex);
        }
    }

    private String toJson(Map<String, Object> payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Khong the serialize payload", ex);
        }
    }

    private String stockKey(String productId) {
        return "stock:" + productId;
    }

    private String infoKey(String productId) {
        return "info:" + productId;
    }
}
