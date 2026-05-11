package com.example.order.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class InventoryProductResponse {

    @JsonProperty("product_id")
    private String productId;
    private String name;
    private Integer stock;
    private Long price;
    @JsonProperty("discount_price")
    private Long discountPrice;
    @JsonProperty("image_url")
    private String imageUrl;

    public String getProductId() {
        return productId;
    }

    public void setProductId(String productId) {
        this.productId = productId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }

    public Long getPrice() {
        return price;
    }

    public void setPrice(Long price) {
        this.price = price;
    }

    public Long getDiscountPrice() {
        return discountPrice;
    }

    public void setDiscountPrice(Long discountPrice) {
        this.discountPrice = discountPrice;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}
