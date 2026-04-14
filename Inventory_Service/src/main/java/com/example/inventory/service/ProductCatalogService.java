package com.example.inventory.service;

import com.example.inventory.dto.CreateProductRequest;
import com.example.inventory.model.Product;
import com.example.inventory.repository.CategoryRepository;
import com.example.inventory.repository.ProductRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Optional;

@Service
/**
 * Service quản lý danh mục sản phẩm: đọc danh sách, tạo mới và cập nhật tồn kho.
 */
public class ProductCatalogService {

    private static final Duration CACHE_TTL = Duration.ofHours(1);

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final StockReservationService stockReservationService;

    public ProductCatalogService(
            ProductRepository productRepository,
            CategoryRepository categoryRepository,
            StockReservationService stockReservationService
    ) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.stockReservationService = stockReservationService;
    }

    /**
     * Lấy sản phẩm theo trang để tối ưu hiệu năng khi danh sách lớn.
     *
     * Input:
     * - page: số trang bắt đầu từ 0.
     * - size: số lượng phần tử mỗi trang.
     *
     * Output:
     * - Page<Product> bao gồm danh sách theo trang và metadata phân trang.
     */
    public Page<Product> getProductsPage(int page, int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id"));
        return productRepository.findAll(pageable);
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
        product.setImageUrl(request.getImageUrl());
        
        // Cập nhật các trường mới
        product.setDescription(request.getDescription());
        if (request.getCategoryId() != null) {
            categoryRepository.findById(request.getCategoryId()).ifPresent(product::setCategory);
        }
        product.setBrand(request.getBrand());
        product.setSku(request.getSku());
        product.setDiscountPrice(request.getDiscountPrice());
        product.setStatus(request.getStatus() != null ? request.getStatus() : "IN_STOCK");
        product.setRating(request.getRating() != null ? request.getRating() : 0.0);
        product.setNumReviews(request.getNumReviews() != null ? request.getNumReviews() : 0);

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

    public Optional<Product> updateProduct(String productId, com.example.inventory.dto.UpdateProductRequest request) {
        Optional<Product> optionalProduct = productRepository.findByProductId(productId);
        if (optionalProduct.isEmpty()) {
            return Optional.empty();
        }

        Product product = optionalProduct.get();
        if (request.getName() != null) product.setName(request.getName());
        if (request.getStock() != null) {
            product.setStock(request.getStock());
            stockReservationService.setStock(productId, request.getStock(), CACHE_TTL);
        }
        if (request.getPrice() != null) product.setPrice(request.getPrice());
        if (request.getImageUrl() != null) product.setImageUrl(request.getImageUrl());
        if (request.getDescription() != null) product.setDescription(request.getDescription());
        if (request.getCategoryId() != null) {
            categoryRepository.findById(request.getCategoryId()).ifPresent(product::setCategory);
        }
        if (request.getBrand() != null) product.setBrand(request.getBrand());
        if (request.getSku() != null) product.setSku(request.getSku());
        if (request.getDiscountPrice() != null) product.setDiscountPrice(request.getDiscountPrice());
        if (request.getStatus() != null) product.setStatus(request.getStatus());

        return Optional.of(productRepository.save(product));
    }

    public void deleteProduct(String productId) {
        productRepository.findByProductId(productId).ifPresent(productRepository::delete);
    }
}