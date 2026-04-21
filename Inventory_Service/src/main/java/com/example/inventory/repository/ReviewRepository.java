package com.example.inventory.repository;

import com.example.inventory.model.Review;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByProductIdOrderByCreatedAtDesc(String productId);
    boolean existsByProductIdAndUserId(String productId, Long userId);
    
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.productId = :productId")
    Double getAverageRating(@Param("productId") String productId);
    
    @Query("SELECT COUNT(r) FROM Review r WHERE r.productId = :productId")
    Long countByProductId(@Param("productId") String productId);
}
