package com.example.inventory.controller;

import com.example.inventory.dto.*;
import com.example.inventory.model.Product;
import com.example.inventory.service.ProductCatalogService;
import com.example.inventory.service.StockCheckService;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
/**
 * Controller cung cấp API cho nghiệp vụ sản phẩm và kiểm tra tồn kho.
 */
public class ProductController {

    private final ProductCatalogService productCatalogService;
    private final StockCheckService stockCheckService;

    public ProductController(
            ProductCatalogService productCatalogService,
            StockCheckService stockCheckService
    ) {
        this.productCatalogService = productCatalogService;
        this.stockCheckService = stockCheckService;
    }

    /**
     * Lấy danh sách sản phẩm theo trang cho giao diện dashboard.
     *
     * Input:
     * - page: số trang bắt đầu từ 0.
     * - size: số lượng sản phẩm mỗi trang.
     *
     * Output:
     * - Page<Product> gồm content và metadata phân trang.
     */
    @GetMapping("/api/products/paged")
    public Page<Product> getProductsPaged(
            @RequestParam(name = "page", defaultValue = "0") int page,
            @RequestParam(name = "size", defaultValue = "24") int size
    ) {
        return productCatalogService.getProductsPage(page, size);
    }

    /**
     * Lấy chi tiết sản phẩm theo mã productId.
     *
     * Input:
     * - id: productId truyền qua path.
     *
     * Output:
     * - 200 + Product nếu tồn tại.
     * - 404 + thông báo lỗi nếu không tìm thấy.
     */
    @GetMapping("/api/products/{id}")
    public ResponseEntity<?> getProductById(@PathVariable("id") String id) {
        Optional<Product> product = productCatalogService.getByProductId(id);
        return product.<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("error", "Không tìm thấy sản phẩm")));
    }

    /**
     * Tạo sản phẩm mới (yêu cầu đã đăng nhập).
     *
     * Input:
     * - request: thông tin tạo sản phẩm.
     * - xUserId: header X-User-Id do API Gateway đính kèm sau khi xác thực JWT.
     *
     * Output:
     * - 201 + dữ liệu sản phẩm mới tạo.
     * - 401 nếu thiếu thông tin người dùng từ Gateway.
     */
    @PostMapping("/admin/products")
    public ResponseEntity<?> createProduct(
            @RequestBody CreateProductRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            @RequestHeader(value = "X-User-Role", required = false) String xUserRole
    ) {
        if (xUserId == null || xUserId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bạn chưa đăng nhập!"));
        }
        if (xUserRole == null || !xUserRole.equalsIgnoreCase("ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bạn không có quyền admin!"));
        }

        Product created = productCatalogService.createProduct(request);
        Map<String, Object> response = new HashMap<>();
        response.put("message", "Tạo thành công");
        response.put("data", created);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Cập nhật tồn kho cho một sản phẩm theo productId.
     *
     * Input:
     * - productId: mã sản phẩm truyền qua path.
     * - request: payload chứa số lượng stock mới.
     *
     * Output:
     * - 200 + dữ liệu sản phẩm đã cập nhật.
     * - 404 nếu không tìm thấy sản phẩm.
     */
    @PutMapping("/admin/products/{product_id}")
    public ResponseEntity<?> updateStock(
            @PathVariable("product_id") String productId,
            @RequestBody UpdateStockRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            @RequestHeader(value = "X-User-Role", required = false) String xUserRole
    ) {
        if (xUserId == null || xUserId.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bạn chưa đăng nhập!"));
        }
        if (xUserRole == null || !xUserRole.equalsIgnoreCase("ADMIN")) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Bạn không có quyền admin!"));
        }
        Optional<Product> updated = productCatalogService.updateStock(productId, request.getStock());
        if (updated.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không thấy sản phẩm"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Cập nhật thành công");
        response.put("data", updated.get());
        return ResponseEntity.ok(response);
    }

    /**
     * Kiểm tra và giữ chỗ tồn kho cho yêu cầu đặt hàng.
     *
     * Input:
    * - request: productId và quantity cần giữ chỗ.
     *
     * Output:
        * - 200 + CheckStockResponse (thành công/thất bại + thông điệp).
     */
    @PostMapping("/api/products/check-stock")
    public ResponseEntity<?> checkStock(@RequestBody CheckStockRequest request) {
        CheckStockResponse response = stockCheckService.checkStock(request);
        return ResponseEntity.ok(response);
    }
}
