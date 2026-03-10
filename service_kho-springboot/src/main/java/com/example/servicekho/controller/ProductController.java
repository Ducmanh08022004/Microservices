package com.example.servicekho.controller;

import com.example.servicekho.dto.*;
import com.example.servicekho.model.Product;
import com.example.servicekho.service.JwtAuthService;
import com.example.servicekho.service.ProductService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = "*")
public class ProductController {

    private final ProductService productService;
    private final JwtAuthService jwtAuthService;

    public ProductController(ProductService productService, JwtAuthService jwtAuthService) {
        this.productService = productService;
        this.jwtAuthService = jwtAuthService;
    }

    @GetMapping("/api/products")
    public List<Product> getAllProducts() {
        return productService.getAllProducts();
    }

    @GetMapping("/api/products/{id}")
    public ResponseEntity<?> getProductById(@PathVariable("id") String id) {
        Optional<Product> product = productService.getByProductId(id);
        return product.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Không tìm thấy sản phẩm")));
    }

    @PostMapping("/admin/products")
    public ResponseEntity<?> createProduct(
            @RequestBody CreateProductRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        if (jwtAuthService.parseBearerToken(authorization).isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bạn chưa đăng nhập!"));
        }

        Product created = productService.createProduct(request);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Tạo thành công");
        response.put("data", created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PutMapping("/admin/products/{product_id}")
    public ResponseEntity<?> updateStock(
            @PathVariable("product_id") String productId,
            @RequestBody UpdateStockRequest request
    ) {
        Optional<Product> updated = productService.updateStock(productId, request.getStock());
        if (updated.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không thấy sản phẩm"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Cập nhật thành công");
        response.put("data", updated.get());
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/products/check-stock")
    public ResponseEntity<?> checkStock(
            @RequestBody CheckStockRequest request,
            @RequestHeader(value = "Authorization", required = false) String authorization
    ) {
        Optional<AuthUser> authUser = jwtAuthService.parseBearerToken(authorization);
        if (authUser.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bạn chưa đăng nhập!"));
        }

        CheckStockResponse response = productService.checkStock(request, authUser.get());
        return ResponseEntity.ok(response);
    }
}
