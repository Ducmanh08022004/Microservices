package com.example.order.repository;

import com.example.order.model.OrderEntity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {
    List<OrderEntity> findAllByUserIdOrderByCreatedAtDesc(Long userId);
    Optional<OrderEntity> findByOrderId(String orderId);
    Page<OrderEntity> findAll(Pageable pageable);

    @Query("SELECT o FROM OrderEntity o WHERE :orderId IS NULL OR o.orderId LIKE %:orderId%")
    Page<OrderEntity> searchOrders(@Param("orderId") String orderId, Pageable pageable);

    @Query(value = "SELECT SUM(total_price) FROM orders WHERE (status = 'PAID' OR status = 'DELIVERED')", nativeQuery = true)
    Double getTotalRevenue();

    @Query(value = "SELECT SUM(total_price) FROM orders WHERE (status = 'PAID' OR status = 'DELIVERED') AND created_at >= :since", nativeQuery = true)
    Double getRevenueSince(@Param("since") LocalDateTime since);

    @Query(value = "SELECT status, COUNT(*) as count FROM orders GROUP BY status", nativeQuery = true)
    List<Map<String, Object>> getOrderStatusStats();

    @Query(value = "SELECT product_name, SUM(quantity) as total_sold FROM orders GROUP BY product_name ORDER BY total_sold DESC LIMIT 5", nativeQuery = true)
    List<Map<String, Object>> getTopSellingProducts();
}
