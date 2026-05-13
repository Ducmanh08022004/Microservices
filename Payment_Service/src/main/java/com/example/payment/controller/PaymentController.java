package com.example.payment.controller;

import com.example.payment.dto.PaymentResponse;
import com.example.payment.service.PaymentApplicationService;
import jakarta.servlet.http.HttpServletRequest;
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

    // ==================== Admin Endpoints ====================

    /**
     * Admin force-update payment status (bỏ qua guard PROCESSING).
     * PUT /api/payments/admin/{orderId}/status
     * Body: { "status": "PAID" | "PAYMENT_FAILED" }
     */
    @PutMapping("/admin/{orderId}/status")
    public ResponseEntity<?> adminUpdatePaymentStatus(
            @PathVariable String orderId,
            @RequestBody Map<String, String> body,
            @RequestHeader(value = "X-User-Role", required = false) String xUserRole
    ) {
        if (!"ADMIN".equalsIgnoreCase(xUserRole)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Không có quyền admin!"));
        }
        String newStatus = body.get("status");
        if (newStatus == null || newStatus.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Status không hợp lệ"));
        }
        var result = paymentApplicationService.adminUpdatePaymentStatus(orderId, newStatus);
        return result.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.ok(Map.of("message", "Không có payment record để cập nhật (bỏ qua)", "orderId", orderId)));
    }

    // ==================== VNPay Endpoints ====================

    /**
     * Tạo URL thanh toán VNPay.
     * POST /api/payments/{orderId}/vnpay-create
     * Frontend sẽ redirect user tới URL này.
     */
    @PostMapping("/{orderId}/vnpay-create")
    public ResponseEntity<?> createVnPayUrl(@PathVariable String orderId, HttpServletRequest request) {
        try {
            String ipAddress = getClientIp(request);
            String paymentUrl = paymentApplicationService.createVnPayUrl(orderId, ipAddress);
            return ResponseEntity.ok(Map.of(
                    "message", "Tạo URL thanh toán VNPay thành công",
                    "paymentUrl", paymentUrl
            ));
        } catch (IllegalStateException ex) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", ex.getMessage()));
        }
    }

    /**
     * VNPay IPN (Instant Payment Notification) — server-to-server callback.
     * GET /api/payments/vnpay-ipn
     * KHÔNG yêu cầu JWT — VNPay gọi trực tiếp.
     */
    @GetMapping("/vnpay-ipn")
    public ResponseEntity<?> vnpayIpn(@RequestParam Map<String, String> params) {
        Map<String, String> result = paymentApplicationService.processVnPayIpn(params);
        return ResponseEntity.ok(result);
    }

    /**
     * VNPay Return URL — redirect trình duyệt sau khi user thanh toán.
     * GET /api/payments/vnpay-return
     * Verify checksum và trả về kết quả để frontend hiển thị.
     */
    @GetMapping("/vnpay-return")
    public ResponseEntity<?> vnpayReturn(@RequestParam Map<String, String> params) {
        Map<String, Object> result = paymentApplicationService.processVnPayReturn(params);
        return ResponseEntity.ok(result);
    }

    /**
     * Lấy IP client từ request (hỗ trợ proxy/load balancer).
     */
    private String getClientIp(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        // X-Forwarded-For có thể chứa nhiều IP, lấy cái đầu tiên
        if (ip != null && ip.contains(",")) {
            ip = ip.split(",")[0].trim();
        }
        return ip;
    }
}
