package com.example.order.service;

import com.example.order.dto.InventoryCheckStockRequest;
import com.example.order.dto.InventoryCheckStockResponse;
import com.example.order.dto.InventoryProductResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Optional;

@Service
public class InventoryClient {

    private final RestTemplate restTemplate;
    private final String inventoryBaseUrl;

    public InventoryClient(RestTemplate restTemplate, @Value("${inventory.base-url:http://localhost:3002}") String inventoryBaseUrl) {
        this.restTemplate = restTemplate;
        this.inventoryBaseUrl = inventoryBaseUrl;
    }

    public Optional<InventoryProductResponse> getProductById(String productId) {
        try {
            ResponseEntity<InventoryProductResponse> response = restTemplate.exchange(
                    inventoryBaseUrl + "/api/products/" + productId,
                    HttpMethod.GET,
                    null,
                    InventoryProductResponse.class
            );
            return Optional.ofNullable(response.getBody());
        } catch (Exception ex) {
            return Optional.empty();
        }
    }

    public Optional<InventoryCheckStockResponse> checkStock(String productId, int quantity) {
        try {
            InventoryCheckStockRequest body = new InventoryCheckStockRequest(productId, quantity);
            ResponseEntity<InventoryCheckStockResponse> response = restTemplate.exchange(
                    inventoryBaseUrl + "/api/products/check-stock",
                    HttpMethod.POST,
                    new HttpEntity<>(body),
                    InventoryCheckStockResponse.class
            );
            return Optional.ofNullable(response.getBody());
        } catch (Exception ex) {
            return Optional.empty();
        }
    }
}
