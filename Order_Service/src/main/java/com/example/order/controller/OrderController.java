package com.example.order.controller;

import com.example.order.dto.AuthUser;
import com.example.order.dto.CreateOrderRequest;
import com.example.order.dto.OrderResponse;
import com.example.order.service.OrderApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.PageRequest;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderApplicationService orderApplicationService;

    public OrderController(OrderApplicationService orderApplicationService) {
        this.orderApplicationService = orderApplicationService;
    }

    @PostMapping
    public ResponseEntity<?> createOrder(
            @RequestBody CreateOrderRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            @RequestHeader(value = "X-User-Email", required = false) String xUserEmail
    ) {
        Optional<AuthUser> authUser = resolveAuthUserFromGatewayHeaders(xUserId, xUserEmail);
        if (authUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bạn chưa đăng nhập!"));
        }

        try {
            OrderResponse created = orderApplicationService.createOrder(request, authUser.get());
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Tạo đơn thành công");
            response.put("data", created);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", ex.getMessage()));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        }
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<?> getOrderById(@PathVariable String orderId) {
        Optional<OrderResponse> order = orderApplicationService.getOrderByOrderId(orderId);
        return order.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Không tìm thấy đơn hàng")));
    }

    @GetMapping
    public ResponseEntity<?> listMyOrders(
            @RequestHeader(value = "X-User-Id", required = false) String xUserId
    ) {
        if (xUserId == null || xUserId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bạn chưa đăng nhập!"));
        }

        try {
            Long userId = Long.valueOf(xUserId);
            java.util.List<OrderResponse> list = orderApplicationService.getOrdersByUserId(userId);
            return ResponseEntity.ok(list);
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "X-User-Id không hợp lệ"));
        }
    }

    @GetMapping("/admin")
    public ResponseEntity<?> listAllOrders(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-User-Role", required = false) String xUserRole
    ) {
        if (!"ADMIN".equalsIgnoreCase(xUserRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bạn không có quyền admin!"));
        }
        return ResponseEntity.ok(orderApplicationService.getAllOrders(PageRequest.of(page, size)));
    }

    @PutMapping("/admin/{orderId}/status")
    public ResponseEntity<?> updateStatus(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Role", required = false) String xUserRole
    ) {
        if (!"ADMIN".equalsIgnoreCase(xUserRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bạn không có quyền admin!"));
        }
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status không hợp lệ"));
        }
        Optional<OrderResponse> updated = orderApplicationService.updateOrderStatus(orderId, status);
        return updated.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không thấy đơn hàng")));
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<?> getStats(
            @RequestHeader(value = "X-User-Role", required = false) String xUserRole
    ) {
        if (!"ADMIN".equalsIgnoreCase(xUserRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bạn không có quyền admin!"));
        }
        return ResponseEntity.ok(orderApplicationService.getAdminStats());
    }

    private Optional<AuthUser> resolveAuthUserFromGatewayHeaders(String xUserId, String xUserEmail) {
        if (xUserId == null || xUserId.isBlank()) {
            return Optional.empty();
        }

        try {
            Long userId = Long.valueOf(xUserId);
            String email = xUserEmail == null ? "" : xUserEmail;
            return Optional.of(new AuthUser(userId, email));
        } catch (NumberFormatException ex) {
            return Optional.empty();
        }
    }
}
