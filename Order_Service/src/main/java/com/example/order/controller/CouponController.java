package com.example.order.controller;

import com.example.order.model.Coupon;
import com.example.order.model.CouponType;
import com.example.order.repository.CouponRepository;
import com.example.order.service.InventoryClient;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.*;

@RestController
@RequestMapping("/api/coupons")
public class CouponController {

    private final CouponRepository repository;
    private final InventoryClient inventoryClient;

    public CouponController(CouponRepository repository, InventoryClient inventoryClient) {
        this.repository = repository;
        this.inventoryClient = inventoryClient;
    }

    @GetMapping("/admin")
    public ResponseEntity<?> getCoupons(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) return ResponseEntity.status(403).body(Map.of("error", "Access denied"));

        Page<Coupon> result = repository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "id")));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/my-daily")
    public ResponseEntity<?> getOrCreateDailyCoupon(
                @RequestHeader(value = "X-User-Id", required = false) String id) {
        if (id == null || id.isBlank())
        {
            return ResponseEntity.status(401).body(Map.of("error","Bạn chưa đăng nhập."));
        }
        Long userId = Long.valueOf(id);
        LocalDateTime startDay = LocalDateTime.now().toLocalDate().atStartOfDay();
        LocalDateTime endDay = LocalDateTime.now().toLocalDate().atTime(23,59,59);

        Optional<Coupon> existing = repository.findByOwnerUserIdAndCreatedAtBetween(userId,startDay,endDay);
        if (existing.isPresent()){
            return ResponseEntity.ok(existing.get());
        }

        Random random = new Random();
        int discountPercent = 5 + random.nextInt(21); //min:5 ; max:25
        Coupon coupon = new Coupon();
        coupon.setCode(("DL" + userId + "_"
                        + UUID.randomUUID().toString().replace("-", "").substring(0, 6))
                        .toUpperCase(Locale.ROOT));
        coupon.setType(CouponType.PERCENT);
        coupon.setOwnerUserId(userId);
        coupon.setValue((long) discountPercent);
        coupon.setMaxUsage(1);
        coupon.setUsedCount(0);
        coupon.setMinOrderValue(50000L);
        coupon.setMaxDiscountAmount(30000L);
        coupon.setExpiresAt(endDay);
        coupon.setIsActive(true);
        coupon.setCreatedAt(LocalDateTime.now());
        // Randomly pick a category from existing categories
        List<String> categoryNames = inventoryClient.fetchCategoryNames();
        if (categoryNames.isEmpty()) {
            coupon.setCategoryName("ALL");
        } else {
            coupon.setCategoryName(categoryNames.get(random.nextInt(categoryNames.size())));
        }
        return ResponseEntity.ok(repository.save(coupon));
    }
    @GetMapping("/my-coupons")
    public ResponseEntity<?> getMyCoupons(
            @RequestHeader(value = "X-User-Id", required = false) String id
    ) {
        if (id == null || id.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Chưa đăng nhập"));
        }
        Long userId = Long.valueOf(id);
        return ResponseEntity.ok(repository.findByOwnerUserId(userId));
    }

    @PostMapping("/admin")
    public ResponseEntity<?> createCoupon(
                @RequestBody Map<String, Object> request, 
                @RequestHeader(value = "X-User-Role", required = false) String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) return ResponseEntity.status(403).body(Map.of("error", "Access denied"));

        String code = normalizeCode(asString(request.get("code")));
        if (code == null || code.isBlank()) {
            code = generateCode();
        }
        if (code.length() > 15) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã code tối đa 15 ký tự"));
        }
        if (repository.existsByCodeIgnoreCase(code)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã code đã tồn tại"));
        }

        String typeRaw = asString(request.get("type"));
        CouponType couponType;
        try {
            couponType = CouponType.valueOf(typeRaw == null ? "" : typeRaw.trim().toUpperCase(Locale.ROOT));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Loại mã giảm giá không hợp lệ"));
        }

        Long value = asLong(request.get("value"));
        if (value == null || value <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Giá trị mã giảm giá phải lớn hơn 0"));
        }
        if (couponType == CouponType.PERCENT && value > 100) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã phần trăm không được vượt quá 100%"));
        }

        Integer maxUsage = asInteger(request.get("maxUsage"));
        if (maxUsage == null || maxUsage <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Số lượt dùng phải lớn hơn 0"));
        }

        Long minOrderValue = asLong(request.get("minOrderValue"));
        if (minOrderValue == null || minOrderValue < 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Đơn hàng tối thiểu không hợp lệ"));
        }

        Long maxDiscountAmount = asLong(request.get("maxDiscountAmount"));
        if (maxDiscountAmount == null || maxDiscountAmount <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Giá trị tối đa được giảm phải lớn hơn 0"));
        }

        LocalDateTime expiresAt;
        try {
            String expiresAtRaw = asString(request.get("expiresAt"));
            if (expiresAtRaw == null || expiresAtRaw.isBlank()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng chọn ngày hết hiệu lực"));
            }
            expiresAt = LocalDateTime.parse(expiresAtRaw);
        } catch (DateTimeParseException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "Ngày hết hiệu lực không hợp lệ"));
        }

        String categoryName = asString(request.get("categoryName"));

        Coupon coupon = new Coupon();
        coupon.setCode(code);
        coupon.setType(couponType);
        coupon.setCategoryName((categoryName == null || categoryName.isBlank()) ? "ALL" : categoryName);
        coupon.setValue(value);
        coupon.setMinOrderValue(minOrderValue);
        coupon.setMaxUsage(maxUsage);
        coupon.setMaxDiscountAmount(maxDiscountAmount);
        coupon.setExpiresAt(expiresAt);
        if (coupon.getIsActive() == null) coupon.setIsActive(true);
        if (coupon.getUsedCount() == null) coupon.setUsedCount(0);

        return ResponseEntity.ok(repository.save(coupon));
    }

    @DeleteMapping("/admin/{id}")
    public ResponseEntity<?> deleteCoupon(@PathVariable Long id, @RequestHeader(value="X-User-Role", required=false) String role) {
        if (!"ADMIN".equalsIgnoreCase(role)) return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        repository.deleteById(id);
        return ResponseEntity.ok(Map.of("message", "Deleted"));
    }

    @PostMapping("/validate")
    public ResponseEntity<?> validateCoupon(@RequestBody Map<String, Object> req) {
        if (!req.containsKey("code") || !req.containsKey("order_value")) {
            return ResponseEntity.badRequest().body(Map.of("error", "Vui lòng truyền code và order_value"));
        }

        String code = (String) req.get("code");
        Long orderValue = Long.valueOf(req.get("order_value").toString());

        Optional<Coupon> opt = repository.findByCodeIgnoreCase(code);
        if (opt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã giảm giá không tồn tại"));
        }

        Coupon c = opt.get();
        if (c.getOwnerUserId() != null) {
            String reqUserId = req.get("user_id") != null
                    ? String.valueOf(req.get("user_id")) : null;
            if (reqUserId == null || !c.getOwnerUserId().equals(Long.valueOf(reqUserId))) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Mã giảm giá này không thuộc về bạn"));
            }
        }
        if (!c.getIsActive() || (c.getExpiresAt() != null && c.getExpiresAt().isBefore(LocalDateTime.now()))) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã giảm giá đã hết hạn hoặc bị vô hiệu hóa"));
        }
        if (c.getMaxUsage() != null && c.getUsedCount() >= c.getMaxUsage()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã giảm giá đã hết lượt sử dụng"));
        }
        if (c.getMinOrderValue() != null && orderValue < c.getMinOrderValue()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Đơn hàng của bạn chưa đạt giá trị tối thiểu " + c.getMinOrderValue()));
        }

        String requestCategory = asString(req.get("category_name"));
        if (requestCategory == null) requestCategory = asString(req.get("categoryName"));
        if (c.getCategoryName() != null
                && !c.getCategoryName().isBlank()
                && !"ALL".equalsIgnoreCase(c.getCategoryName())
                && requestCategory != null
                && !requestCategory.isBlank()
                && !c.getCategoryName().equalsIgnoreCase(requestCategory)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Mã giảm giá không áp dụng cho danh mục này"));
        }

        long discount = c.getType() == CouponType.PERCENT 
                ? (long) (orderValue * (c.getValue() / 100.0)) 
                : c.getValue();
        if (c.getMaxDiscountAmount() != null && c.getMaxDiscountAmount() > 0) {
            discount = Math.min(discount, c.getMaxDiscountAmount());
        }
        discount = Math.min(discount, orderValue);

        // Không cấu hình sử dụng trừ coupon thật vì mock flow
        return ResponseEntity.ok(Map.of(
            "discount_amount", discount,
            "message", "Mã giảm giá hợp lệ"
        ));
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value).trim();
    }

    private static Long asLong(Object value) {
        if (value == null) return null;
        try {
            return Long.valueOf(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static Integer asInteger(Object value) {
        if (value == null) return null;
        try {
            return Integer.valueOf(String.valueOf(value));
        } catch (NumberFormatException ex) {
            return null;
        }
    }

    private static String normalizeCode(String code) {
        if (code == null) return null;
        return code.replaceAll("\\s+", "").toUpperCase(Locale.ROOT);
    }

    private static String generateCode() {
        return ("CP" + UUID.randomUUID().toString().replace("-", ""))
                .toUpperCase(Locale.ROOT)
                .substring(0, 15);
    }
}
