package com.example.inventory.repository;

import com.example.inventory.model.Product;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Repository truy cập dữ liệu bảng products.
 */
public interface ProductRepository extends JpaRepository<Product, Long> {

        @Query("""
                        SELECT p
                        FROM Product p
                        WHERE (
                                :search IS NULL OR :search = ''
                                OR p.productId LIKE %:search%
                                OR p.name LIKE %:search%
                                OR p.brand LIKE %:search%
                        )
                        AND (:categoryId IS NULL OR p.category.id = :categoryId)
                        """)
        Page<Product> searchProducts(@Param("search") String search, @Param("categoryId") Long categoryId, Pageable pageable);

        @Query("""
                        SELECT p
                        FROM Product p
                        WHERE (:categoryId IS NULL OR p.category.id = :categoryId)
                        """)
        Page<Product> findAllByCategoryId(@Param("categoryId") Long categoryId, Pageable pageable);

    /**
     * Tìm sản phẩm theo productId nghiệp vụ.
     */
    Optional<Product> findByProductId(String productId);

    @Modifying
    @Query("""
            update Product p
            set p.stock = p.stock - :quantity
            where p.productId = :productId and p.stock >= :quantity
            """)
    /**
     * Trừ stock trực tiếp trong DB nếu còn đủ số lượng.
     *
     * Output:
     * - Số dòng bị ảnh hưởng (0 nếu không đủ hàng hoặc không tìm thấy sản phẩm).
     */
    int decrementStockIfEnough(@Param("productId") String productId, @Param("quantity") int quantity);

    @Modifying
    @Query("""
            update Product p
            set p.stock = case when p.stock >= :quantity then p.stock - :quantity else 0 end
            where p.productId = :productId
            """)
    /**
     * Đồng bộ tồn kho DB từ lượng đã reserve ở Redis.
     *
     * Output:
     * - Số dòng bị ảnh hưởng (0 nếu không tìm thấy sản phẩm).
     */
    int applyReservedStock(@Param("productId") String productId, @Param("quantity") int quantity);
}
