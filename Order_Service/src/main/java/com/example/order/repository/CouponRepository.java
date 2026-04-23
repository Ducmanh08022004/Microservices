package com.example.order.repository;

import com.example.order.model.Coupon;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CouponRepository extends JpaRepository<Coupon, Long> {
    Optional<Coupon> findByCode(String code);
    Optional<Coupon> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
    Optional<Coupon> findByOwnerUserIdAndCreatedAtBetween(Long ownerUserId, LocalDateTime start, LocalDateTime end);
    Page<Coupon> findByOwnerUserIdIsNull(Pageable pageable);
    List<Coupon> findByOwnerUserId(Long ownerUserId);
}
