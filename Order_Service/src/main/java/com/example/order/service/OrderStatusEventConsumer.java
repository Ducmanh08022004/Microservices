package com.example.order.service;

import com.example.order.dto.OrderStatusEventPayload;
import com.example.order.model.OrderEntity;
import com.example.order.repository.CouponRepository;
import com.example.order.repository.OrderRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
/**
 * Consumer nhận các sự kiện cập nhật trạng thái đơn hàng từ:
 * 1. topic order-status — Inventory_Service gửi sau khi trừ kho (CONFIRMED/FAILED_UPDATE)
 * 2. topic payment-result — Payment_Service gửi sau khi xử lý thanh toán (PAID/PAYMENT_FAILED)
 */
public class OrderStatusEventConsumer {

    private static final Logger log = LoggerFactory.getLogger(OrderStatusEventConsumer.class);

    private static final String ORDER_STATUS_TOPIC = "order-status";
    private static final String ORDER_STATUS_GROUP = "order-status-updater";

    private static final String PAYMENT_RESULT_TOPIC = "payment-result";
    private static final String PAYMENT_RESULT_GROUP = "order-payment-result-consumer";

    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_PAYMENT_FAILED = "PAYMENT_FAILED";

    private final ObjectMapper objectMapper;
    private final OrderRepository orderRepository;
    private final CouponRepository couponRepository;
    private final OrderEventPublisher orderEventPublisher;

    public OrderStatusEventConsumer(
            ObjectMapper objectMapper,
            OrderRepository orderRepository,
            CouponRepository couponRepository,
            OrderEventPublisher orderEventPublisher
    ) {
        this.objectMapper = objectMapper;
        this.orderRepository = orderRepository;
        this.couponRepository = couponRepository;
        this.orderEventPublisher = orderEventPublisher;
    }

    /**
     * Nhận kết quả từ Inventory_Service sau khi trừ kho.
     * Cập nhật status đơn hàng thành CONFIRMED hoặc FAILED_UPDATE.
     */
    @KafkaListener(topics = ORDER_STATUS_TOPIC, groupId = ORDER_STATUS_GROUP)
    public void consumeOrderStatusEvent(String message) {
        try {
            OrderStatusEventPayload event = objectMapper.readValue(message, OrderStatusEventPayload.class);
            if (event == null || event.getOrderId() == null || event.getOrderId().isBlank()) {
                return;
            }
            if (event.getStatus() == null || event.getStatus().isBlank()) {
                return;
            }

            Optional<OrderEntity> orderOptional = orderRepository.findByOrderId(event.getOrderId());
            if (orderOptional.isEmpty()) {
                log.warn("Không tìm thấy orderId={} để cập nhật status={}", event.getOrderId(), event.getStatus());
                return;
            }

            OrderEntity order = orderOptional.get();
            if (STATUS_CONFIRMED.equals(event.getStatus()) && STATUS_PAID.equals(order.getStatus())) {
                log.info("Bỏ qua status CONFIRMED từ inventory vì orderId={} đã ở trạng thái PAID", event.getOrderId());
                return;
            }

            if (!event.getStatus().equals(order.getStatus())) {
                order.setStatus(event.getStatus());
                orderRepository.save(order);
                log.info("Đã cập nhật orderId={} sang status={}", event.getOrderId(), event.getStatus());
            }
        } catch (Exception ex) {
            log.error("Lỗi cập nhật status đơn hàng từ order-status: {}", ex.getMessage(), ex);
        }
    }

    /**
     * Nhận kết quả thanh toán từ Payment_Service.
     * - Nếu PAID: cập nhật đơn thành PAID rồi publish sang order-paid để Inventory trừ kho.
     * - Nếu PAYMENT_FAILED: cập nhật đơn thành PAYMENT_FAILED.
     */
    @KafkaListener(topics = PAYMENT_RESULT_TOPIC, groupId = PAYMENT_RESULT_GROUP)
    @Transactional
    public void consumePaymentResultEvent(String message) {
        try {
            OrderStatusEventPayload event = objectMapper.readValue(message, OrderStatusEventPayload.class);
            if (event == null || event.getOrderId() == null || event.getOrderId().isBlank()) {
                return;
            }

            Optional<OrderEntity> orderOptional = orderRepository.findByOrderId(event.getOrderId());
            if (orderOptional.isEmpty()) {
                log.warn("Không tìm thấy orderId={} trong payment-result event", event.getOrderId());
                return;
            }

            OrderEntity order = orderOptional.get();
            String previousStatus = order.getStatus();

            if (!event.getStatus().equals(previousStatus)) {
                order.setStatus(event.getStatus());
                orderRepository.save(order);
                log.info("Đã cập nhật orderId={} sang status={} từ payment-result", event.getOrderId(), event.getStatus());
            }

            // Nếu thanh toán thành công → publish order-paid để Inventory trừ kho
            if (STATUS_PAID.equals(event.getStatus()) && !STATUS_PAID.equals(previousStatus)) {
                applyCouponUsage(order.getCouponCode());
                com.example.order.dto.AuthUser authUser = null;
                if (order.getUserEmail() != null) {
                    authUser = new com.example.order.dto.AuthUser(order.getUserId(), order.getUserEmail());
                }
                orderEventPublisher.publishOrderPaid(order, authUser);
                log.info("Đã publish order-paid cho orderId={}", order.getOrderId());
            } else if (STATUS_PAYMENT_FAILED.equals(event.getStatus())) {
                log.info("Thanh toán thất bại cho orderId={}, không trừ kho", order.getOrderId());
            }

        } catch (Exception ex) {
            log.error("Lỗi xử lý payment-result event: {}", ex.getMessage(), ex);
        }
    }

    private void applyCouponUsage(String couponCode) {
        if (couponCode == null || couponCode.isBlank()) {
            return;
        }

        couponRepository.findByCodeIgnoreCase(couponCode.trim()).ifPresentOrElse(coupon -> {
            int usedCount = coupon.getUsedCount() == null ? 0 : coupon.getUsedCount();
            coupon.setUsedCount(usedCount + 1);
            couponRepository.save(coupon);
            log.info("Đã cập nhật used_count cho coupon={} thành {}", coupon.getCode(), usedCount + 1);
        }, () -> log.warn("Không tìm thấy coupon={} để cập nhật used_count", couponCode));
    }
}