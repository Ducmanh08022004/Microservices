package com.example.payment.service;

import com.example.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
public class PaymentTimeoutScheduler {

    private static final Logger log = LoggerFactory.getLogger(PaymentTimeoutScheduler.class);
    private static final int TIMEOUT_MINUTES = 30;

    private final PaymentRepository paymentRepository;

    public PaymentTimeoutScheduler(PaymentRepository paymentRepository) {
        this.paymentRepository = paymentRepository;
    }

    /**
     * Chạy mỗi 5 phút, hủy các payment PROCESSING quá 30 phút.
     */
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    @Transactional
    public void cancelExpiredPayments() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(TIMEOUT_MINUTES);
        int count = paymentRepository.cancelExpiredPayments(cutoff);
        if (count > 0) {
            log.info("Đã tự động hủy {} payment hết hạn (> {} phút)", count, TIMEOUT_MINUTES);
            // Publish event cho từng payment đã hủy nếu cần notify Order_Service
        }
    }
}
