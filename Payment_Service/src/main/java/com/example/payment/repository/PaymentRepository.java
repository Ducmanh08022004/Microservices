package com.example.payment.repository;

import com.example.payment.model.PaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {
    Optional<PaymentEntity> findByOrderId(String orderId);
    boolean existsByOrderId(String orderId);

    @Modifying
    @Query("UPDATE PaymentEntity p SET p.status = 'PAYMENT_FAILED', p.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE p.status = 'PROCESSING' AND p.createdAt < :cutoff")
    int cancelExpiredPayments(@Param("cutoff") LocalDateTime cutoff);
}
