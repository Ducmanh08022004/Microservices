package com.example.servicekho.repository;

import com.example.servicekho.model.Product;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByProductId(String productId);

    @Modifying
    @Query("""
            update Product p
            set p.stock = p.stock - :quantity
            where p.productId = :productId and p.stock >= :quantity
            """)
    int decrementStockIfEnough(@Param("productId") String productId, @Param("quantity") int quantity);
}
