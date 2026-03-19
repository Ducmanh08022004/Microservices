package com.example.inventory.repository;

import com.example.inventory.model.Product;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

/**
 * Repository truy cập dữ liệu bảng products.
 */
public interface ProductRepository extends JpaRepository<Product, Long> {

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
