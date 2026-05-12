package com.example.order.service;

import com.example.order.repository.CouponRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
public class CouponCleanupScheduler {

    private static final Logger log = LoggerFactory.getLogger(CouponCleanupScheduler.class);

    private final CouponRepository couponRepository;

    public CouponCleanupScheduler(CouponRepository couponRepository) {
        this.couponRepository = couponRepository;
    }

    @Scheduled(cron = "0 0 0,11 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void deleteExpiredCoupons() {
        long deletedCount = couponRepository.deleteByExpiresAtBefore(LocalDateTime.now());
        if (deletedCount > 0) {
            log.info("Deleted {} expired coupons", deletedCount);
        } else {
            log.debug("No expired coupons found for cleanup");
        }
    }
}