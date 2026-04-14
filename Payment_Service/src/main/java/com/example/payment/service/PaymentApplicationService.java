package com.example.payment.service;

import com.example.payment.dto.PaymentResponse;
import com.example.payment.model.PaymentEntity;
import com.example.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class PaymentApplicationService {

    private static final Logger log = LoggerFactory.getLogger(PaymentApplicationService.class);

    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_FAILED = "PAYMENT_FAILED";

    private final PaymentRepository paymentRepository;
    private final PaymentEventPublisher paymentEventPublisher;

    public PaymentApplicationService(
            PaymentRepository paymentRepository,
            PaymentEventPublisher paymentEventPublisher
    ) {
        this.paymentRepository = paymentRepository;
        this.paymentEventPublisher = paymentEventPublisher;
    }

    /**
     * Lấy thông tin payment theo orderId.
     */
    public Optional<PaymentResponse> getPaymentByOrderId(String orderId) {
        return paymentRepository.findByOrderId(orderId).map(this::toResponse);
    }

    /**
     * Xác nhận thanh toán thành công (Mock mode).
     * Cập nhật status=PAID và publish event payment-result lên Kafka.
     */
    @Transactional
    public PaymentResponse confirmPayment(String orderId) {
        PaymentEntity payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy payment cho orderId=" + orderId));

        if (!STATUS_PROCESSING.equals(payment.getStatus())) {
            throw new IllegalStateException(
                    "Payment không ở trạng thái PROCESSING. Trạng thái hiện tại: " + payment.getStatus()
            );
        }

        payment.setStatus(STATUS_PAID);
        paymentRepository.save(payment);
        log.info("Payment confirmed cho orderId={}", orderId);

        // Publish event lên Kafka để Order_Service cập nhật
        paymentEventPublisher.publishPaymentResult(orderId, STATUS_PAID, "Thanh toán thành công");

        return toResponse(payment);
    }

    /**
     * Hủy/thất bại thanh toán.
     */
    @Transactional
    public PaymentResponse cancelPayment(String orderId) {
        PaymentEntity payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy payment cho orderId=" + orderId));

        if (!STATUS_PROCESSING.equals(payment.getStatus())) {
            throw new IllegalStateException(
                    "Payment không ở trạng thái PROCESSING. Trạng thái hiện tại: " + payment.getStatus()
            );
        }

        payment.setStatus(STATUS_FAILED);
        paymentRepository.save(payment);
        log.info("Payment cancelled cho orderId={}", orderId);

        paymentEventPublisher.publishPaymentResult(orderId, STATUS_FAILED, "Thanh toán bị hủy");

        return toResponse(payment);
    }

    public void processMomoIPN(String orderId, int resultCode) {
        log.info("Processing Momo IPN for orderId={}, resultCode={}", orderId, resultCode);
        if (resultCode == 0) {
            confirmPayment(orderId);
        } else {
            cancelPayment(orderId);
        }
    }

    private PaymentResponse toResponse(PaymentEntity p) {
        PaymentResponse r = new PaymentResponse();
        r.setPaymentId(p.getPaymentId());
        r.setOrderId(p.getOrderId());
        r.setAmount(p.getAmount());
        r.setStatus(p.getStatus());
        return r;
    }
}
