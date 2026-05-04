package com.example.payment.service;

import com.example.payment.model.PaymentEntity;
import com.example.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
public class PaymentTimeoutScheduler {

    private static final Logger log = LoggerFactory.getLogger(PaymentTimeoutScheduler.class);
    private static final int TIMEOUT_MINUTES = 30;
    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_FAILED = "PAYMENT_FAILED";

    private final PaymentRepository paymentRepository;
    private final PaymentEventPublisher paymentEventPublisher;

    public PaymentTimeoutScheduler(PaymentRepository paymentRepository,
                                   PaymentEventPublisher paymentEventPublisher) {
        this.paymentRepository = paymentRepository;
        this.paymentEventPublisher = paymentEventPublisher;
    }

    /**
     * Chạy mỗi 5 phút, hủy các payment PROCESSING quá 30 phút.
     * Publish payment-result=PAYMENT_FAILED cho từng payment để Order_Service cập nhật.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    @Transactional
    public void cancelExpiredPayments() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(TIMEOUT_MINUTES);
        List<PaymentEntity> expired = paymentRepository.findExpiredPayments(STATUS_PROCESSING, cutoff);

        if (expired.isEmpty()) {
            return;
        }

        for (PaymentEntity payment : expired) {
            payment.setStatus(STATUS_FAILED);
            paymentRepository.save(payment);

            // Publish event để Order_Service cập nhật trạng thái đơn hàng
            paymentEventPublisher.publishPaymentResult(
                    payment.getOrderId(),
                    STATUS_FAILED,
                    "Thanh toán hết hạn (quá " + TIMEOUT_MINUTES + " phút)"
            );

            log.info("Đã hủy payment hết hạn: orderId={}, paymentId={}",
                    payment.getOrderId(), payment.getPaymentId());
        }

        log.info("Đã tự động hủy {} payment hết hạn (> {} phút)", expired.size(), TIMEOUT_MINUTES);
    }
}
