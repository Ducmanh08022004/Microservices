package com.example.inventory.dto;

/**
 * DTO lưu thông tin sản phẩm dùng trong Redis cache.
 */
public class ProductInfoCache {
    private String name;
    private Double price;

    public ProductInfoCache() {
    }

    public ProductInfoCache(String name, Double price) {
        this.name = name;
        this.price = price;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Double getPrice() {
        return price;
    }

    public void setPrice(Double price) {
        this.price = price;
    }
}
