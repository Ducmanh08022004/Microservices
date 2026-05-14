package com.example.order.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

/**
 * Client gọi nội bộ sang Payment_Service để đồng bộ trạng thái thanh toán
 * khi admin cập nhật trạng thái đơn hàng.
 */
@Service
public class PaymentClient {

    private static final Logger log = LoggerFactory.getLogger(PaymentClient.class);

    private final RestTemplate restTemplate;
    private final String paymentBaseUrl;

    public PaymentClient(
            RestTemplate restTemplate,
            @Value("${payment.base-url:http://payment-service:8080}") String paymentBaseUrl
    ) {
        this.restTemplate = restTemplate;
        this.paymentBaseUrl = paymentBaseUrl;
    }

    /**
     * Map order status → payment status tương ứng.
     * Chỉ PAID và PAYMENT_FAILED cần đồng bộ sang payment.
     * Returns null nếu không cần đồng bộ.
     */
    public static String mapOrderStatusToPaymentStatus(String orderStatus) {
        if (orderStatus == null) return null;
        return switch (orderStatus) {
            case "PAID"            -> "PAID";
            case "PAYMENT_FAILED"  -> "PAYMENT_FAILED";
            case "CANCELLED"       -> "PAYMENT_FAILED";
            default                -> null; // PROCESSING, PENDING_PAYMENT, CONFIRMED → không cần đồng bộ payment
        };
    }

    /**
     * Gọi Payment_Service để admin force-update payment status.
     * Bỏ qua lỗi — nếu Payment_Service không có record (PROCESSING) thì log và tiếp tục.
     */
    public void adminSyncPaymentStatus(String orderId, String paymentStatus, String adminRole) {
        if (paymentStatus == null) return;
        try {
            String url = paymentBaseUrl + "/api/payments/admin/" + orderId + "/status";

            // Tạo header với X-User-Role để pass guard
            var headers = new org.springframework.http.HttpHeaders();
            headers.set("X-User-Role", adminRole != null ? adminRole : "ADMIN");
            var request = new HttpEntity<>(Map.of("status", paymentStatus), headers);

            restTemplate.exchange(url, HttpMethod.PUT, request, Map.class);
            log.info("Đã đồng bộ payment status orderId={} → {}", orderId, paymentStatus);
        } catch (RestClientException ex) {
            // Không throw — payment sync là best-effort, không block order update
            log.warn("Không thể đồng bộ payment status cho orderId={}: {}", orderId, ex.getMessage());
        }
    }
}
