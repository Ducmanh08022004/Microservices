package com.example.order.controller;

import com.example.order.model.Coupon;
import com.example.order.model.CouponType;
import com.example.order.repository.CouponRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponRepository repository;

    public CouponController(CouponRepository repository) {
        this.repository = repository;
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateCoupon(@RequestBody Map<String, Object> req) {
        if (!req.containsKey("code") || !req.containsKey("order_value")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng truyền code và order_value"));
        }

        String code = (String) req.get("code");
        Double orderValue = Double.valueOf(req.get("order_value").toString());

        Optional<Coupon> opt = repository.findByCode(code);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã giảm giá không tồn tại"));
        }

        Coupon c = opt.get();
        if (!c.getIsActive() || (c.getExpiresAt() != null && c.getExpiresAt().isBefore(LocalDateTime.now()))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã giảm giá đã hết hạn hoặc bị vô hiệu hóa"));
        }
        if (c.getMaxUsage() != null && c.getUsedCount() >= c.getMaxUsage()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã giảm giá đã hết lượt sử dụng"));
        }
        if (c.getMinOrderValue() != null && orderValue < c.getMinOrderValue()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Đơn hàng của bạn chưa đạt giá trị tối thiểu " + c.getMinOrderValue()));
        }

        double discount = c.getType() == CouponType.PERCENT 
                ? orderValue * (c.getValue() / 100.0) 
                : c.getValue();

        // Không cấu hình sử dụng trừ coupon thật vì mock flow
        return ResponseEntity.ok(Map.of(
            "discount_amount", discount,
            "message", "Mã giảm giá hợp lệ"
        ));
    }
}
