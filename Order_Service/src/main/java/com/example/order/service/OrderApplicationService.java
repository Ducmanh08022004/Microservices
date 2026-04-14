package com.example.order.service;

import com.example.order.dto.AuthUser;
import com.example.order.dto.CreateOrderRequest;
import com.example.order.dto.InventoryCheckStockResponse;
import com.example.order.dto.InventoryProductResponse;
import com.example.order.dto.OrderResponse;
import com.example.order.model.OrderEntity;
import com.example.order.repository.OrderRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class OrderApplicationService {

    private static final String ORDER_STATUS_PENDING_PAYMENT = "PENDING_PAYMENT";

    private final OrderRepository orderRepository;
    private final InventoryClient inventoryClient;
    private final OrderEventPublisher orderEventPublisher;

    public OrderApplicationService(
            OrderRepository orderRepository,
            InventoryClient inventoryClient,
            OrderEventPublisher orderEventPublisher
    ) {
        this.orderRepository = orderRepository;
        this.inventoryClient = inventoryClient;
        this.orderEventPublisher = orderEventPublisher;
    }

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
        order.setTotalPrice(product.getPrice() * request.getQuantity());
        order.setStatus(ORDER_STATUS_PENDING_PAYMENT);

        OrderEntity saved = orderRepository.save(order);
        orderEventPublisher.publishOrderCreated(saved, authUser);

        return toOrderResponse(saved);
    }

    public Optional<OrderResponse> getOrderByOrderId(String orderId) {
        return orderRepository.findByOrderId(orderId).map(this::toOrderResponse);
    }

    public java.util.List<OrderResponse> getOrdersByUserId(Long userId) {
        return orderRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toOrderResponse)
                .toList();
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
        response.setQuantity(order.getQuantity());
        response.setTotalPrice(order.getTotalPrice());
        response.setStatus(order.getStatus());
        return response;
    }
}
