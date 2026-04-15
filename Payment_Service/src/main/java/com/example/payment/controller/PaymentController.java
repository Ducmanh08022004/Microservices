package com.example.payment.controller;

import com.example.payment.dto.PaymentResponse;
import com.example.payment.service.PaymentApplicationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentApplicationService paymentApplicationService;

    public PaymentController(PaymentApplicationService paymentApplicationService) {
        this.paymentApplicationService = paymentApplicationService;
    }

    /**
     * Lấy thông tin payment theo orderId.
     * GET /api/payments/{orderId}
     */
    @GetMapping("/{orderId}")
    public ResponseEntity<?> getPayment(@PathVariable String orderId) {
        Optional<PaymentResponse> payment = paymentApplicationService.getPaymentByOrderId(orderId);
        return payment.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Không tìm thấy thông tin thanh toán cho đơn hàng này")));
    }

    /**
     * Xác nhận thanh toán thành công (Mock mode).
     * POST /api/payments/{orderId}/confirm
     */
    @PostMapping("/{orderId}/confirm")
    public ResponseEntity<?> confirmPayment(@PathVariable String orderId) {
        try {
            PaymentResponse result = paymentApplicationService.confirmPayment(orderId);
            return ResponseEntity.ok(Map.of(
                    "message", "Thanh toán thành công!",
                    "data", result
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * Hủy thanh toán.
     * POST /api/payments/{orderId}/cancel
     */
    @PostMapping("/{orderId}/cancel")
    public ResponseEntity<?> cancelPayment(@PathVariable String orderId) {
        try {
            PaymentResponse result = paymentApplicationService.cancelPayment(orderId);
            return ResponseEntity.ok(Map.of(
                    "message", "Đã hủy thanh toán.",
                    "data", result
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        }
    }
}
