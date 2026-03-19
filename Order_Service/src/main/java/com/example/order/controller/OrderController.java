package com.example.order.controller;

import com.example.order.dto.AuthUser;
import com.example.order.dto.CreateOrderRequest;
import com.example.order.dto.OrderResponse;
import com.example.order.service.JwtAuthService;
import com.example.order.service.OrderApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/orders")
@CrossOrigin(origins = "*")
public class OrderController {

    private final OrderApplicationService orderApplicationService;
    private final JwtAuthService jwtAuthService;

    public OrderController(OrderApplicationService orderApplicationService, JwtAuthService jwtAuthService) {
        this.orderApplicationService = orderApplicationService;
        this.jwtAuthService = jwtAuthService;
    }

    @PostMapping
    public ResponseEntity<?> createOrder(
            @RequestBody CreateOrderRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Optional<AuthUser> authUser = jwtAuthService.parseBearerToken(authorization);
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
}
