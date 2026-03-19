package com.example.order.service;

import com.example.order.dto.AuthUser;
import com.example.order.dto.CreateOrderRequest;
import com.example.order.dto.InventoryCheckStockResponse;
import com.example.order.dto.InventoryProductResponse;
import com.example.order.dto.OrderResponse;
import com.example.order.model.OrderEntity;
import com.example.order.repository.OrderRepository;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;

@Service
public class OrderApplicationService {

    private static final String ORDER_STATUS_PENDING_UPDATE = "PENDING_UPDATE";

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
        order.setStatus(ORDER_STATUS_PENDING_UPDATE);

        OrderEntity saved = orderRepository.save(order);
        orderEventPublisher.publishOrderCreated(saved, authUser);

        return toOrderResponse(saved);
    }

    public Optional<OrderResponse> getOrderByOrderId(String orderId) {
        return orderRepository.findByOrderId(orderId).map(this::toOrderResponse);
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
