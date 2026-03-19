package com.example.order.dto;

/**
 * Payload nhận từ Inventory để cập nhật trạng thái đơn hàng.
 */
public class OrderStatusEventPayload {
    private String orderId;
    private String status;
    private String message;

    public String getOrderId() {
        return orderId;
    }

    public void setOrderId(String orderId) {
        this.orderId = orderId;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}