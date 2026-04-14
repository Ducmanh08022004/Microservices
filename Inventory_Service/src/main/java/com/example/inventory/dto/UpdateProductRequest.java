package com.example.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class UpdateProductRequest {
    private String name;
    private Integer stock;
    private Double price;
    
    @JsonProperty("image_url")
    private String imageUrl;
    
    private String description;
    
    @JsonProperty("category_id")
    private Long categoryId;
    
    private String brand;
    private String sku;
    
    @JsonProperty("discount_price")
    private Double discountPrice;
    
    private String status;

    // Getters and Setters
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public Double getPrice() { return price; }
    public void setPrice(Double price) { this.price = price; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public Long getCategoryId() { return categoryId; }
    public void setCategoryId(Long categoryId) { this.categoryId = categoryId; }
    public String getBrand() { return brand; }
    public void setBrand(String brand) { this.brand = brand; }
    public String getSku() { return sku; }
    public void setSku(String sku) { this.sku = sku; }
    public Double getDiscountPrice() { return discountPrice; }
    public void setDiscountPrice(Double discountPrice) { this.discountPrice = discountPrice; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}
