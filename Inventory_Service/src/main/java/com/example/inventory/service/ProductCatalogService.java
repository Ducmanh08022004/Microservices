package com.example.inventory.service;

import com.example.inventory.dto.CreateProductRequest;
import com.example.inventory.model.Product;
import com.example.inventory.repository.ProductRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
/**
 * Service quản lý danh mục sản phẩm: đọc danh sách, tạo mới và cập nhật tồn kho.
 */
public class ProductCatalogService {

    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final ProductRepository productRepository;
    private final StockReservationService stockReservationService;

    public ProductCatalogService(
            ProductRepository productRepository,
            StockReservationService stockReservationService
    ) {
        this.productRepository = productRepository;
        this.stockReservationService = stockReservationService;
    }

    /**
     * Lấy toàn bộ sản phẩm từ DB.
     *
     * Output:
     * - Danh sách Product.
     */
    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    /**
     * Tìm sản phẩm theo productId.
     *
     * Input:
     * - productId: mã sản phẩm.
     *
     * Output:
     * - Optional<Product>, rỗng nếu không tìm thấy.
     */
    public Optional<Product> getByProductId(String productId) {
        return productRepository.findByProductId(productId);
    }

    /**
     * Tạo mới sản phẩm.
     *
     * Input:
     * - request: product_id, name, stock, price.
     *
     * Output:
     * - Product đã được lưu trong DB.
     */
    public Product createProduct(CreateProductRequest request) {
        Product product = new Product();
        product.setProductId(request.getProductId());
        product.setName(request.getName());
        product.setStock(request.getStock() == null ? 0 : request.getStock());
        product.setPrice(request.getPrice() == null ? 0D : request.getPrice());
        product.setCreatedAt(LocalDateTime.now());
        return productRepository.save(product);
    }

    /**
     * Cập nhật stock trong DB và đồng bộ cache stock trong Redis.
     *
     * Input:
     * - productId: mã sản phẩm.
     * - stock: số lượng tồn kho mới.
     *
     * Output:
     * - Optional<Product>: dữ liệu sau cập nhật, hoặc rỗng nếu không có sản phẩm.
     */
    public Optional<Product> updateStock(String productId, Integer stock) {
        Optional<Product> optionalProduct = productRepository.findByProductId(productId);
        if (optionalProduct.isEmpty()) {
            return Optional.empty();
        }

        Product product = optionalProduct.get();
        product.setStock(stock);
        Product updated = productRepository.save(product);

        stockReservationService.setStock(productId, stock, CACHE_TTL);
        return Optional.of(updated);
    }
}