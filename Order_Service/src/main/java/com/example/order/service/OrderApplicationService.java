package com.example.order.service;

import com.example.order.dto.AuthUser;
import com.example.order.dto.CreateOrderRequest;
import com.example.order.dto.InventoryCheckStockResponse;
import com.example.order.dto.InventoryProductResponse;
import com.example.order.dto.OrderResponse;
import com.example.order.model.Coupon;
import com.example.order.model.CouponType;
import com.example.order.model.OrderEntity;
import com.example.order.repository.CouponRepository;
import com.example.order.repository.OrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class OrderApplicationService {

    private static final String ORDER_STATUS_PROCESSING = "PROCESSING";

    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final InventoryClient inventoryClient;
    private final OrderEventPublisher orderEventPublisher;

    public OrderApplicationService(
            OrderRepository orderRepository,
            CouponRepository couponRepository,
            InventoryClient inventoryClient,
            OrderEventPublisher orderEventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.couponRepository = couponRepository;
        this.inventoryClient = inventoryClient;
        this.orderEventPublisher = orderEventPublisher;
    }

    @Transactional
    public OrderResponse createOrder(CreateOrderRequest request, AuthUser authUser) {
        validateRequest(request);

        InventoryProductResponse product = inventoryClient.getProductById(request.getProductId())
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy sản phẩm trong Inventory_Service"));

        InventoryCheckStockResponse reserveResult = inventoryClient.checkStock(request.getProductId(), request.getQuantity())
                .orElseThrow(() -> new IllegalStateException("Không gọi được API kiểm tra kho"));

        if (!reserveResult.isAvailable()) {
            throw new IllegalStateException(
                    reserveResult.getMessage() == null ? "Kho không đủ hàng" : reserveResult.getMessage()
            );
        }

        OrderEntity order = new OrderEntity();
        order.setOrderId(UUID.randomUUID().toString());
        order.setUserId(authUser.getId());
        order.setProductId(product.getProductId());
        order.setProductName(product.getName());
        order.setQuantity(request.getQuantity());
        double unitPrice = resolveEffectiveUnitPrice(product);
        double grossTotal = unitPrice * request.getQuantity();
        String normalizedCouponCode = normalizeCouponCode(request.getCouponCode());
        double discount = resolveCouponDiscount(normalizedCouponCode, grossTotal);
        order.setTotalPrice(Math.max(0.0, grossTotal - discount));
        order.setStatus(ORDER_STATUS_PROCESSING);
        order.setCouponCode(normalizedCouponCode);
        if (authUser.getEmail() != null && !authUser.getEmail().isBlank()) {
            order.setUserEmail(authUser.getEmail());
        }

        OrderEntity saved = orderRepository.save(order);
        orderEventPublisher.publishOrderCreated(saved);

        return toOrderResponse(saved);
    }

    public Optional<OrderResponse> cancelOrder(String orderId, Long userId) {
        return orderRepository.findByOrderId(orderId).map(order -> {
            // Chỉ user chủ đơn mới được hủy
            if (!order.getUserId().equals(userId)) {
                throw new IllegalStateException("Bạn không có quyền hủy đơn này!");
            }
            // Chỉ được hủy khi đang ở trạng thái PROCESSING
            if (!"PROCESSING".equals(order.getStatus())) {
                throw new IllegalStateException(
                    "Chỉ được hủy đơn ở trạng thái PROCESSING. " +
                    "Trạng thái hiện tại: " + order.getStatus()
                );
            }
            order.setStatus("CANCELLED");
            return toOrderResponse(orderRepository.save(order));
        });
    }

    public Optional<OrderResponse> getOrderByOrderId(String orderId) {
        return orderRepository.findByOrderId(orderId).map(this::toOrderResponse);
    }

    public java.util.List<OrderResponse> getOrdersByUserId(Long userId) {
        return orderRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toOrderResponse)
                .toList();
    }

    public Page<OrderResponse> getOrdersByUserIdPaged(Long userId, Pageable pageable) {
        return orderRepository.findAllByUserIdOrderByCreatedAtDesc(userId, pageable)
                .map(this::toOrderResponse);
    }

    public Page<OrderResponse> getAllOrders(Pageable pageable, String orderId) {
        if (orderId != null && !orderId.isBlank()) {
            return orderRepository.searchOrders(orderId, pageable)
                    .map(this::toOrderResponse);
        }
        return orderRepository.findAll(pageable)
                .map(this::toOrderResponse);
    }

    public Optional<OrderResponse> updateOrderStatus(String orderId, String status) {
        return orderRepository.findByOrderId(orderId).map(order -> {
            order.setStatus(status);
            return toOrderResponse(orderRepository.save(order));
        });
    }

    public Map<String, Object> getAdminStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("total_revenue", coalesce(orderRepository.getTotalRevenue()));
        stats.put("daily_revenue", coalesce(orderRepository.getRevenueSince(LocalDateTime.now().minusDays(1))));
        stats.put("weekly_revenue", coalesce(orderRepository.getRevenueSince(LocalDateTime.now().minusWeeks(1))));
        stats.put("monthly_revenue", coalesce(orderRepository.getRevenueSince(LocalDateTime.now().minusMonths(1))));
        stats.put("status_distribution", orderRepository.getOrderStatusStats());
        stats.put("top_products", orderRepository.getTopSellingProducts());
        stats.put("daily_chart", orderRepository.getDailyRevenue(LocalDateTime.now().minusDays(30)));
        return stats;
    }

    private Double coalesce(Double val) {
        return val != null ? val : 0.0;
    }

    private void validateRequest(CreateOrderRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("Request không hợp lệ");
        }
        if (request.getProductId() == null || request.getProductId().isBlank()) {
            throw new IllegalArgumentException("product_id không hợp lệ");
        }
        if (request.getQuantity() == null || request.getQuantity() <= 0) {
            throw new IllegalArgumentException("quantity phải > 0");
        }
    }

    private OrderResponse toOrderResponse(OrderEntity order) {
        OrderResponse response = new OrderResponse();
        response.setOrderId(order.getOrderId());
        response.setProductId(order.getProductId());
        response.setProductName(order.getProductName());
        response.setQuantity(order.getQuantity());
        response.setTotalPrice(order.getTotalPrice());
        response.setStatus(order.getStatus());
        response.setCreatedAt(order.getCreatedAt());

        return response;
    }

    private String normalizeCouponCode(String couponCode) {
        if (couponCode == null || couponCode.isBlank()) {
            return null;
        }

        return couponCode.trim();
    }

    private double resolveCouponDiscount(String couponCode, double orderValue) {
        if (couponCode == null) {
            return 0.0;
        }

        Coupon coupon = couponRepository.findByCodeIgnoreCase(couponCode)
                .orElseThrow(() -> new IllegalStateException("Mã giảm giá không tồn tại"));

        if (!Boolean.TRUE.equals(coupon.getIsActive())
                || (coupon.getExpiresAt() != null && coupon.getExpiresAt().isBefore(LocalDateTime.now()))) {
            throw new IllegalStateException("Mã giảm giá đã hết hạn hoặc bị vô hiệu hóa");
        }

        int usedCount = coupon.getUsedCount() == null ? 0 : coupon.getUsedCount();
        if (coupon.getMaxUsage() != null && usedCount >= coupon.getMaxUsage()) {
            throw new IllegalStateException("Mã giảm giá đã hết lượt sử dụng");
        }

        if (coupon.getMinOrderValue() != null && orderValue < coupon.getMinOrderValue()) {
            throw new IllegalStateException("Đơn hàng chưa đạt giá trị tối thiểu để áp mã");
        }

        double discount = coupon.getType() == CouponType.PERCENT
                ? orderValue * (coupon.getValue() / 100.0)
                : coupon.getValue();

        if (coupon.getMaxDiscountAmount() != null && coupon.getMaxDiscountAmount() > 0) {
            discount = Math.min(discount, coupon.getMaxDiscountAmount());
        }

        discount = Math.min(discount, orderValue);

        return discount;
    }

    private double resolveEffectiveUnitPrice(InventoryProductResponse product) {
        Double discountPrice = product.getDiscountPrice();
        if (discountPrice != null && discountPrice > 0) {
            return discountPrice;
        }

        Double price = product.getPrice();
        if (price == null || price <= 0) {
            throw new IllegalStateException("Giá sản phẩm không hợp lệ");
        }

        return price;
    }
}
