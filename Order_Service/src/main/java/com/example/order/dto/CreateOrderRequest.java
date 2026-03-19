package com.example.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CreateOrderRequest {

    @JsonProperty("product_id")
    private String productId;
    private Integer quantity;

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
}
