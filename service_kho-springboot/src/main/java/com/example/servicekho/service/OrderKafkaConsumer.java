package com.example.servicekho.service;

import com.example.servicekho.model.Product;
import com.example.servicekho.repository.ProductRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class OrderKafkaConsumer {

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    public OrderKafkaConsumer(ProductRepository productRepository, ObjectMapper objectMapper) {
        this.productRepository = productRepository;
        this.objectMapper = objectMapper;
    }

    @KafkaListener(topics = "order", groupId = "kho-db-updater")
    public void consumeOrderEvent(String message) {
        try {
            JsonNode jsonNode = objectMapper.readTree(message);
            String status = jsonNode.path("status").asText("");
            if (!"PENDING_UPDATE".equals(status)) {
                return;
            }

            String productId = jsonNode.path("productId").asText("");
            int quantity = jsonNode.path("quantity").asInt(0);
            if (productId.isBlank() || quantity <= 0) {
                return;
            }

            Optional<Product> optionalProduct = productRepository.findByProductId(productId);
            if (optionalProduct.isEmpty()) {
                return;
            }

            Product product = optionalProduct.get();
            int newStock = Math.max(0, product.getStock() - quantity);
            product.setStock(newStock);
            productRepository.save(product);
        } catch (Exception ignored) { 
        }
    }
}
