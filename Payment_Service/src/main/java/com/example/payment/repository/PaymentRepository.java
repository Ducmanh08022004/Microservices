package com.example.payment.repository;

import com.example.payment.model.PaymentEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<PaymentEntity, Long> {
    Optional<PaymentEntity> findByOrderId(String orderId);
    boolean existsByOrderId(String orderId);
    Optional<PaymentEntity> findByVnpTxnRef(String vnpTxnRef);

    @Query("SELECT p FROM PaymentEntity p WHERE p.status = :status AND p.createdAt < :cutoff")
    List<PaymentEntity> findExpiredPayments(@Param("status") String status, @Param("cutoff") LocalDateTime cutoff);
}
