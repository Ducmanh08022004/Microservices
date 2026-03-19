package com.example.order.dto;

public class InventoryCheckStockRequest {
    private String productId;
    private Integer quantity;

    public InventoryCheckStockRequest() {
    }

    public InventoryCheckStockRequest(String productId, Integer quantity) {
        this.productId = productId;
        this.quantity = quantity;
    }

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
