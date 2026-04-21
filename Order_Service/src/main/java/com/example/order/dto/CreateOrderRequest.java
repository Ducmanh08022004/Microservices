package com.example.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CreateOrderRequest {

    @JsonProperty("product_id")
    private String productId;
    private Integer quantity;

    @JsonProperty("coupon_code")
    private String couponCode;

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }
}
