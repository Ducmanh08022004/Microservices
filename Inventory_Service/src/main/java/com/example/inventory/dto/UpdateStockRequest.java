package com.example.inventory.dto;

/**
 * DTO request cập nhật số lượng tồn kho của sản phẩm.
 */
public class UpdateStockRequest {
    private Integer stock;

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }
}
