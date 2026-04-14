package com.example.payment.dto;

/**
 * Payload gửi lên Kafka topic payment-result.
 * Được consume bởi Order_Service để cập nhật trạng thái đơn hàng.
 */
public class PaymentResultEventPayload {
    private String orderId;
    /** PAID hoặc PAYMENT_FAILED */
    private String status;
    private String message;

    public String getOrderId() { return orderId; }
    public void setOrderId(String orderId) { this.orderId = orderId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
}
