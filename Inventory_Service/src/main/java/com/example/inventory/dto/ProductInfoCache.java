package com.example.inventory.dto;

/**
 * DTO lưu thông tin sản phẩm dùng trong Redis cache.
 */
public class ProductInfoCache {
    private String name;
    private Long price;

    public ProductInfoCache() {
    }

    public ProductInfoCache(String name, Long price) {
        this.name = name;
        this.price = price;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Long getPrice() {
        return price;
    }

    public void setPrice(Long price) {
        this.price = price;
    }
}
