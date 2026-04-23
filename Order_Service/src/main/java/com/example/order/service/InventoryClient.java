package com.example.order.service;

import com.example.order.dto.InventoryCheckStockRequest;
import com.example.order.dto.InventoryCheckStockResponse;
import com.example.order.dto.InventoryProductResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

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

    /**
     * Fetch all category names from the Inventory Service.
     * Returns a list of category name strings, or an empty list on failure.
     */
    @SuppressWarnings("unchecked")
    public List<String> fetchCategoryNames() {
        try {
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                    inventoryBaseUrl + "/api/categories?page=0&size=100",
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<Map<String, Object>>() {}
            );
            Map<String, Object> body = response.getBody();
            if (body == null) return Collections.emptyList();

            Object content = body.get("content");
            if (content instanceof List<?>) {
                return ((List<?>) content).stream()
                        .filter(item -> item instanceof Map)
                        .map(item -> (String) ((Map<String, Object>) item).get("name"))
                        .filter(name -> name != null && !name.isBlank())
                        .collect(Collectors.toList());
            }
            return Collections.emptyList();
        } catch (Exception ex) {
            return Collections.emptyList();
        }
    }
}
