package com.example.payment.service;

import com.example.payment.dto.OrderCreatedEventPayload;
import com.example.payment.model.PaymentEntity;
import com.example.payment.repository.PaymentRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Locale;
import java.util.concurrent.ThreadLocalRandom;

@Service
/**
 * Consumer lắng nghe topic order-created.
 * Khi nhận được đơn hàng PROCESSING, tạo bản ghi payment và bắt đầu xử lý.
 * Đây là Mock mode: tự động publish payment-result=PAID để giả lập thanh toán thành công.
 */
public class PaymentKafkaConsumer {

    private static final Logger log = LoggerFactory.getLogger(PaymentKafkaConsumer.class);

    private static final String ORDER_CREATED_TOPIC = "order-created";
    private static final String PAYMENT_GROUP = "payment-processor";
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String PAYMENT_ID_PREFIX = "PM";
    private static final int PAYMENT_ID_TIME_PART_LENGTH = 6;
    private static final int PAYMENT_ID_RANDOM_PART_LENGTH = 4;
    private static final int PAYMENT_ID_MAX_GENERATION_ATTEMPTS = 20;

    private final PaymentRepository paymentRepository;
    private final ObjectMapper objectMapper;

    public PaymentKafkaConsumer(
            PaymentRepository paymentRepository,
            ObjectMapper objectMapper
    ) {
        this.paymentRepository = paymentRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Nhận event đơn hàng mới từ Order_Service.
     * Tạo bản ghi payment với status=PROCESSING và lưu vào DB.
     * Payment sẽ ở trạng thái PROCESSING cho đến khi user xác nhận qua REST API.
     */
    @KafkaListener(topics = ORDER_CREATED_TOPIC, groupId = PAYMENT_GROUP)
    public void consumeOrderCreated(String message) {
        try {
            OrderCreatedEventPayload event = objectMapper.readValue(message, OrderCreatedEventPayload.class);

            if (event == null || event.getOrderId() == null || event.getOrderId().isBlank()) {
                log.warn("Nhận được event order-created không hợp lệ, bỏ qua.");
                return;
            }
            if (!STATUS_PROCESSING.equals(event.getStatus())) {
                log.debug("Event orderId={} không ở trạng thái PROCESSING, bỏ qua.", event.getOrderId());
                return;
            }

            // Kiểm tra idempotency: đã có payment cho đơn này chưa?
            if (paymentRepository.existsByOrderId(event.getOrderId())) {
                log.warn("Payment cho orderId={} đã tồn tại, bỏ qua.", event.getOrderId());
                return;
            }

            // Tạo bản ghi payment với status=PROCESSING
            PaymentEntity payment = new PaymentEntity();
            payment.setPaymentId(generatePaymentId());
            payment.setOrderId(event.getOrderId());
            payment.setUserId(event.getUserId());
            payment.setAmount(event.getTotalPrice());
            payment.setStatus(STATUS_PROCESSING);
            paymentRepository.save(payment);

            log.info("Đã tạo payment cho orderId={}, amount={}, status=PROCESSING",
                    event.getOrderId(), event.getTotalPrice());

        } catch (Exception ex) {
            log.error("Lỗi khi xử lý order-created event: {}", ex.getMessage(), ex);
        }
    }

    private String generatePaymentId() {
        for (int attempt = 0; attempt < PAYMENT_ID_MAX_GENERATION_ATTEMPTS; attempt++) {
            String paymentId = buildPaymentIdCandidate();
            if (!paymentRepository.existsByPaymentId(paymentId)) {
                return paymentId;
            }
        }

        throw new IllegalStateException("Không thể sinh mã thanh toán duy nhất");
    }

    private String buildPaymentIdCandidate() {
        String timePart = toFixedBase36(Instant.now().getEpochSecond(), PAYMENT_ID_TIME_PART_LENGTH);
        String randomPart = toFixedBase36(ThreadLocalRandom.current().nextLong((long) Math.pow(36, PAYMENT_ID_RANDOM_PART_LENGTH)), PAYMENT_ID_RANDOM_PART_LENGTH);
        return PAYMENT_ID_PREFIX + timePart + randomPart;
    }

    private String toFixedBase36(long value, int length) {
        String encoded = Long.toString(value, 36).toUpperCase(Locale.ROOT);
        if (encoded.length() > length) {
            return encoded.substring(encoded.length() - length);
        }
        return "0".repeat(length - encoded.length()) + encoded;
    }
}
