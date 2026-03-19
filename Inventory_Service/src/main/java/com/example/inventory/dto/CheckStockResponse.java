package com.example.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO response cho API kiểm tra tồn kho.
 */
public class CheckStockResponse {

    @JsonProperty("isAvailable")
    private boolean available;
    private String message;

    public CheckStockResponse(boolean available, String message) {
        this.available = available;
        this.message = message;
    }

    public boolean isAvailable() {
        return available;
    }

    public String getMessage() {
        return message;
    }
}
