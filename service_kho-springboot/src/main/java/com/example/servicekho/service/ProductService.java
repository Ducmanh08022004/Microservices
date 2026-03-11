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
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductService {

    private static final String ORDER_TOPIC = "order";
    private static final String EMAIL_TOPIC = "send-email-topic-v2";
    private static final String ORDER_STATUS_PENDING_UPDATE = "PENDING_UPDATE";
    private static final String INFO_KEY_PREFIX = "info:";
    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final ProductRepository productRepository;
    private final StringRedisTemplate redisTemplate;
    private final StockReservationService stockReservationService;
    private final KafkaTemplate<String, String> kafkaTemplate;
    private final ObjectMapper objectMapper;

    public ProductService(
            ProductRepository productRepository,
            StringRedisTemplate redisTemplate,
            StockReservationService stockReservationService,
            KafkaTemplate<String, String> kafkaTemplate,
            ObjectMapper objectMapper
    ) {
        this.productRepository = productRepository;
        this.redisTemplate = redisTemplate;
        this.stockReservationService = stockReservationService;
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

        stockReservationService.setStock(productId, stock, CACHE_TTL);
        return Optional.of(updated);
    }

    public CheckStockResponse checkStock(CheckStockRequest request, AuthUser authUser) {
        if (!isValidCheckStockRequest(request)) {
            return new CheckStockResponse(false, "Dữ liệu kiểm tra kho không hợp lệ");
        }

        String productId = request.getProductId();
        int qty = request.getQuantity();

        String infoKey = infoKey(productId);

        CheckStockResponse cacheResponse = tryReserveFromCache(authUser, productId, qty, infoKey);
        if (cacheResponse != null) {
            return cacheResponse;
        }

        return tryReserveFromDatabase(authUser, productId, qty, infoKey);
    }

    private boolean isValidCheckStockRequest(CheckStockRequest request) {
        return request.getProductId() != null
                && !request.getProductId().isBlank()
                && request.getQuantity() != null
                && request.getQuantity() > 0;
    }

    private CheckStockResponse tryReserveFromCache(
            AuthUser authUser,
            String productId,
            int quantity,
            String infoKey
    ) {
        String cachedInfo = redisTemplate.opsForValue().get(infoKey);
        if (cachedInfo == null) {
            return null;
        }

        StockReservationService.ReservationResult reserveResult = stockReservationService.reserve(productId, quantity);
        if (reserveResult == StockReservationService.ReservationResult.SUCCESS) {
            ProductInfoCache info = readProductInfoCache(cachedInfo);
            double totalPrice = info.getPrice() * quantity;

            publishOrderAndEmail(authUser, productId, info.getName(), quantity, totalPrice);
            return new CheckStockResponse(true, "Đã giữ chỗ thành công (Redis)");
        }

        if (reserveResult == StockReservationService.ReservationResult.NOT_ENOUGH) {
            return new CheckStockResponse(false, "Hết hàng rồi (Redis)");
        }

        if (reserveResult == StockReservationService.ReservationResult.CACHE_MISS) {
            return null;
        }

        return null;
    }

    private CheckStockResponse tryReserveFromDatabase(
            AuthUser authUser,
            String productId,
            int quantity,
            String infoKey
    ) {
        Optional<Product> optionalProduct = productRepository.findByProductId(productId);
        if (optionalProduct.isEmpty()) {
            return new CheckStockResponse(false, "Không tìm thấy sản phẩm");
        }

        Product product = optionalProduct.get();
        if (product.getStock() < quantity) {
            return new CheckStockResponse(false, "Kho không đủ hàng (DB)");
        }

        double totalPrice = product.getPrice() * quantity;

        stockReservationService.setStockIfAbsent(productId, product.getStock(), CACHE_TTL);
        writeProductInfoCache(infoKey, product.getName(), product.getPrice());

        StockReservationService.ReservationResult reserveResult = stockReservationService.reserve(productId, quantity);
        if (reserveResult == StockReservationService.ReservationResult.SUCCESS) {
            publishOrderAndEmail(authUser, productId, product.getName(), quantity, totalPrice);
            return new CheckStockResponse(true, "Đã giữ chỗ thành công (DB)");
        }

        if (reserveResult == StockReservationService.ReservationResult.NOT_ENOUGH) {
            return new CheckStockResponse(false, "Kho không đủ hàng (Redis)");
        }

        return new CheckStockResponse(false, "Không thể giữ chỗ sản phẩm");
    }

    private void publishOrderAndEmail(AuthUser authUser, String productId, String name, int quantity, double totalPrice) {
        String orderId = UUID.randomUUID().toString();

        OrderEventPayload orderPayload = new OrderEventPayload();
        orderPayload.setOrderId(orderId);
        orderPayload.setUserId(authUser.getId());
        orderPayload.setProductId(productId);
        orderPayload.setName(name);
        orderPayload.setQuantity(quantity);
        orderPayload.setTotalPrice(totalPrice);
        orderPayload.setStatus(ORDER_STATUS_PENDING_UPDATE);

        EmailEventPayload emailPayload = new EmailEventPayload();
        emailPayload.setTo(authUser.getEmail());
        emailPayload.setSubject("gmail xac nhan don");
        emailPayload.setContent("Ten san pham: " + name + ", Tong tien: " + totalPrice);
        emailPayload.setOrderId(orderId);

        kafkaTemplate.send(ORDER_TOPIC, productId, toJson(orderPayload));
        if (authUser.getEmail() != null && !authUser.getEmail().isBlank()) {
            kafkaTemplate.send(EMAIL_TOPIC, authUser.getEmail(), toJson(emailPayload));
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

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Khong the serialize payload", ex);
        }
    }

    private String infoKey(String productId) {
        return INFO_KEY_PREFIX + productId;
    }
}
