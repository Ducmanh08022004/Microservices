package com.example.payment.service;

import com.example.payment.config.VnPayConfig;
import com.example.payment.dto.PaymentResponse;
import com.example.payment.model.PaymentEntity;
import com.example.payment.repository.PaymentRepository;
import com.example.payment.util.VnPayUtil;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class PaymentApplicationService {

    private static final Logger log = LoggerFactory.getLogger(PaymentApplicationService.class);

    private static final String STATUS_PROCESSING = "PROCESSING";
    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_FAILED = "PAYMENT_FAILED";

    private static final DateTimeFormatter VNP_DATE_FMT = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final PaymentRepository paymentRepository;
    private final PaymentEventPublisher paymentEventPublisher;
    private final VnPayConfig vnPayConfig;

    public PaymentApplicationService(
            PaymentRepository paymentRepository,
            PaymentEventPublisher paymentEventPublisher,
            VnPayConfig vnPayConfig
    ) {
        this.paymentRepository = paymentRepository;
        this.paymentEventPublisher = paymentEventPublisher;
        this.vnPayConfig = vnPayConfig;
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

    /**
     * Admin force-update payment status (bỏ qua guard PROCESSING).
     * Được gọi nội bộ từ Order_Service khi admin sửa trạng thái đơn hàng.
     * Cho phép: PAID, PAYMENT_FAILED
     */
    @Transactional
    public Optional<PaymentResponse> adminUpdatePaymentStatus(String orderId, String newStatus) {
        // Chỉ cho phép các trạng thái hợp lệ
        if (!STATUS_PAID.equals(newStatus) && !STATUS_FAILED.equals(newStatus)) {
            log.warn("Admin update: Trạng thái không hỗ trợ cho payment: {}", newStatus);
            return Optional.empty();
        }

        return paymentRepository.findByOrderId(orderId).map(payment -> {
            String oldStatus = payment.getStatus();
            payment.setStatus(newStatus);
            paymentRepository.save(payment);
            log.info("Admin đã cập nhật payment orderId={}: {} → {}", orderId, oldStatus, newStatus);
            return toResponse(payment);
        });
    }

    // ==================== VNPay Integration ====================

    /**
     * Tạo URL thanh toán VNPay cho một đơn hàng.
     * 1. Tìm payment record (phải ở PROCESSING)
     * 2. Sinh vnp_TxnRef unique
     * 3. Build params theo spec VNPay
     * 4. Trả về URL đầy đủ có chữ ký HMAC SHA512
     */
    @Transactional
    public String createVnPayUrl(String orderId, String ipAddress) {
        PaymentEntity payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new IllegalStateException("Không tìm thấy payment cho orderId=" + orderId));

        if (!STATUS_PROCESSING.equals(payment.getStatus())) {
            throw new IllegalStateException(
                    "Payment không ở trạng thái PROCESSING. Trạng thái hiện tại: " + payment.getStatus()
            );
        }

        // Sinh mã tham chiếu unique cho VNPay (gắn với orderId)
        String vnpTxnRef = orderId + "_" + VnPayUtil.getRandomNumber(4);

        // Cập nhật payment method và txn ref
        payment.setPaymentMethod("VNPAY");
        payment.setVnpTxnRef(vnpTxnRef);
        paymentRepository.save(payment);

        // Số tiền × 100 (VNPay yêu cầu triệt tiêu phần thập phân)
        long amount = payment.getAmount() * 100;

        LocalDateTime now = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh"));
        String createDate = now.format(VNP_DATE_FMT);
        String expireDate = now.plusMinutes(15).format(VNP_DATE_FMT);

        // Normalize IP — VNPay không chấp nhận IPv6
        String ip = ipAddress;
        if (ip == null || ip.isEmpty() || ip.contains(":")) {
            ip = "127.0.0.1";
        }

        log.info("=== VNPay Config Debug ===");
        log.info("  tmnCode=[{}]", vnPayConfig.getTmnCode());
        log.info("  hashSecret=[{}] (length={})", vnPayConfig.getHashSecret(), 
                 vnPayConfig.getHashSecret() != null ? vnPayConfig.getHashSecret().length() : 0);
        log.info("  payUrl=[{}]", vnPayConfig.getPayUrl());
        log.info("  returnUrl=[{}]", vnPayConfig.getReturnUrl());
        log.info("  apiVersion=[{}]", vnPayConfig.getApiVersion());
        log.info("  ipAddress=[{}]", ip);

        Map<String, String> params = new HashMap<>();
        params.put("vnp_Version", vnPayConfig.getApiVersion());
        params.put("vnp_Command", "pay");
        params.put("vnp_TmnCode", vnPayConfig.getTmnCode());
        params.put("vnp_Amount", String.valueOf(amount));
        params.put("vnp_CurrCode", "VND");
        params.put("vnp_TxnRef", vnpTxnRef);
        params.put("vnp_OrderInfo", "Thanh toan don hang " + orderId);
        params.put("vnp_OrderType", "other");
        params.put("vnp_Locale", "vn");
        params.put("vnp_ReturnUrl", vnPayConfig.getReturnUrl());
        params.put("vnp_IpAddr", ip);
        params.put("vnp_CreateDate", createDate);
        params.put("vnp_ExpireDate", expireDate);

        String paymentUrl = VnPayUtil.buildPaymentUrl(params, vnPayConfig.getHashSecret(), vnPayConfig.getPayUrl());

        log.info("Đã tạo VNPay URL cho orderId={}, vnpTxnRef={}", orderId, vnpTxnRef);
        log.info("VNPay Payment URL: {}", paymentUrl);
        return paymentUrl;
    }

    /**
     * Xử lý VNPay Return URL (redirect trình duyệt sau khi user thanh toán).
     * 1. Verify checksum
     * 2. Tìm payment theo vnp_TxnRef
     * 3. Nếu chưa xử lý → cập nhật status + publish Kafka
     * 4. Trả về PaymentResponse
     */
    @Transactional
    public Map<String, Object> processVnPayReturn(Map<String, String> params) {
        Map<String, Object> result = new HashMap<>();

        // 1. Verify signature
        boolean validSignature = VnPayUtil.validateSignature(params, vnPayConfig.getHashSecret());
        if (!validSignature) {
            log.warn("VNPay Return: Chữ ký không hợp lệ!");
            result.put("success", false);
            result.put("message", "Chữ ký không hợp lệ");
            return result;
        }

        String vnpTxnRef = params.get("vnp_TxnRef");
        String vnpResponseCode = params.get("vnp_ResponseCode");
        String vnpTransactionNo = params.get("vnp_TransactionNo");
        String vnpBankCode = params.get("vnp_BankCode");
        String vnpAmountStr = params.get("vnp_Amount");

        log.info("VNPay Return: vnpTxnRef={}, responseCode={}, transNo={}",
                vnpTxnRef, vnpResponseCode, vnpTransactionNo);

        // 2. Tìm payment
        Optional<PaymentEntity> optPayment = paymentRepository.findByVnpTxnRef(vnpTxnRef);
        if (optPayment.isEmpty()) {
            log.warn("VNPay Return: Không tìm thấy payment cho vnpTxnRef={}", vnpTxnRef);
            result.put("success", false);
            result.put("message", "Không tìm thấy giao dịch");
            return result;
        }

        PaymentEntity payment = optPayment.get();

        // 3. Kiểm tra amount khớp
        if (vnpAmountStr != null) {
            long vnpAmount = Long.parseLong(vnpAmountStr); // Đã ×100
            long expectedAmount = payment.getAmount() * 100;
            if (vnpAmount != expectedAmount) {
                log.warn("VNPay Return: Amount không khớp! vnp={}, expected={}", vnpAmount, expectedAmount);
                result.put("success", false);
                result.put("message", "Số tiền không khớp");
                return result;
            }
        }

        // 4. Cập nhật nếu còn PROCESSING (idempotent — nếu đã xử lý thì bỏ qua)
        if (STATUS_PROCESSING.equals(payment.getStatus())) {
            if ("00".equals(vnpResponseCode)) {
                payment.setStatus(STATUS_PAID);
                log.info("VNPay: Thanh toán thành công cho orderId={}", payment.getOrderId());
                paymentEventPublisher.publishPaymentResult(payment.getOrderId(), STATUS_PAID, "VNPay thanh toán thành công");
            } else {
                payment.setStatus(STATUS_FAILED);
                log.info("VNPay: Thanh toán thất bại cho orderId={}, responseCode={}", payment.getOrderId(), vnpResponseCode);
                paymentEventPublisher.publishPaymentResult(payment.getOrderId(), STATUS_FAILED, "VNPay thanh toán thất bại: " + vnpResponseCode);
            }

            payment.setVnpTransactionNo(vnpTransactionNo);
            payment.setVnpBankCode(vnpBankCode);
            paymentRepository.save(payment);
        }

        result.put("success", "00".equals(vnpResponseCode));
        result.put("message", "00".equals(vnpResponseCode) ? "Thanh toán thành công" : "Thanh toán thất bại");
        result.put("data", toResponse(payment));
        return result;
    }

    /**
     * Xử lý VNPay IPN (server-to-server callback).
     * Tương tự processVnPayReturn nhưng trả về format theo spec VNPay.
     */
    @Transactional
    public Map<String, String> processVnPayIpn(Map<String, String> params) {
        Map<String, String> result = new HashMap<>();

        // 1. Verify signature
        boolean validSignature = VnPayUtil.validateSignature(params, vnPayConfig.getHashSecret());
        if (!validSignature) {
            result.put("RspCode", "97");
            result.put("Message", "Invalid signature");
            return result;
        }

        String vnpTxnRef = params.get("vnp_TxnRef");
        String vnpResponseCode = params.get("vnp_ResponseCode");
        String vnpTransactionNo = params.get("vnp_TransactionNo");
        String vnpBankCode = params.get("vnp_BankCode");
        String vnpAmountStr = params.get("vnp_Amount");

        // 2. Tìm payment
        Optional<PaymentEntity> optPayment = paymentRepository.findByVnpTxnRef(vnpTxnRef);
        if (optPayment.isEmpty()) {
            result.put("RspCode", "01");
            result.put("Message", "Order not found");
            return result;
        }

        PaymentEntity payment = optPayment.get();

        // 3. Kiểm tra amount
        if (vnpAmountStr != null) {
            long vnpAmount = Long.parseLong(vnpAmountStr);
            long expectedAmount = payment.getAmount() * 100;
            if (vnpAmount != expectedAmount) {
                result.put("RspCode", "04");
                result.put("Message", "Invalid amount");
                return result;
            }
        }

        // 4. Kiểm tra đã xử lý chưa (idempotent)
        if (!STATUS_PROCESSING.equals(payment.getStatus())) {
            result.put("RspCode", "02");
            result.put("Message", "Order already confirmed");
            return result;
        }

        // 5. Cập nhật
        if ("00".equals(vnpResponseCode)) {
            payment.setStatus(STATUS_PAID);
            paymentEventPublisher.publishPaymentResult(payment.getOrderId(), STATUS_PAID, "VNPay IPN thanh toán thành công");
        } else {
            payment.setStatus(STATUS_FAILED);
            paymentEventPublisher.publishPaymentResult(payment.getOrderId(), STATUS_FAILED, "VNPay IPN thất bại: " + vnpResponseCode);
        }
        payment.setVnpTransactionNo(vnpTransactionNo);
        payment.setVnpBankCode(vnpBankCode);
        paymentRepository.save(payment);

        result.put("RspCode", "00");
        result.put("Message", "Confirm Success");
        return result;
    }

    private PaymentResponse toResponse(PaymentEntity p) {
        PaymentResponse r = new PaymentResponse();
        r.setPaymentId(p.getPaymentId());
        r.setOrderId(p.getOrderId());
        r.setAmount(p.getAmount());
        r.setStatus(p.getStatus());
        r.setPaymentMethod(p.getPaymentMethod());
        r.setVnpTxnRef(p.getVnpTxnRef());
        r.setVnpTransactionNo(p.getVnpTransactionNo());
        r.setVnpBankCode(p.getVnpBankCode());
        return r;
    }
}
