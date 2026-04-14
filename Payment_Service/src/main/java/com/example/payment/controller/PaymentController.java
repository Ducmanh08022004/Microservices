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
    private final com.example.payment.service.MomoService momoService;

    public PaymentController(PaymentApplicationService paymentApplicationService, 
                             com.example.payment.service.MomoService momoService) {
        this.paymentApplicationService = paymentApplicationService;
        this.momoService = momoService;
    }

    /**
     * Tạo link thanh toán Momo cho đơn hàng.
     * GET /api/payments/{orderId}/momo
     */
    @GetMapping("/{orderId}/momo")
    public ResponseEntity<?> createMomoPayment(@PathVariable String orderId) {
        Optional<PaymentResponse> payment = paymentApplicationService.getPaymentByOrderId(orderId);
        if (payment.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không tìm thấy thông tin đơn hàng"));
        }
        
        String payUrl = momoService.createPaymentUrl(orderId, payment.get().getAmount().longValue());
        if (payUrl != null) {
            return ResponseEntity.ok(Map.of("payUrl", payUrl));
        }
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Không thể tạo link thanh toán Momo"));
    }

    /**
     * Nhận thông báo IPN từ Momo.
     * POST /api/payments/momo-ipn
     */
    @PostMapping("/momo-ipn")
    public ResponseEntity<?> momoIPN(@RequestBody Map<String, Object> body) {
        // Momo gửi result trong body: orderId, resultCode, ...
        String orderId = (String) body.get("orderId");
        Integer resultCode = (Integer) body.get("resultCode");
        
        if (orderId != null && resultCode != null) {
            paymentApplicationService.processMomoIPN(orderId, resultCode);
        }
        
        // Luôn trả về 204 cho Momo để báo đã nhận
        return ResponseEntity.noContent().build();
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
