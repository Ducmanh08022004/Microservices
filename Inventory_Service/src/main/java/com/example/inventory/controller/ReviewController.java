package com.example.inventory.controller;

import com.example.inventory.model.Review;
import com.example.inventory.repository.ProductRepository;
import com.example.inventory.repository.ReviewRepository;
import com.example.inventory.dto.ReviewRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/products/{productId}/reviews")
public class ReviewController {

    private final ReviewRepository reviewRepository;
    private final ProductRepository productRepository;

    public ReviewController(ReviewRepository reviewRepository, ProductRepository productRepository) {
        this.reviewRepository = reviewRepository;
        this.productRepository = productRepository;
    }

    @GetMapping
    public ResponseEntity<?> getReviews(@PathVariable String productId) {
        return ResponseEntity.ok(reviewRepository.findByProductIdOrderByCreatedAtDesc(productId));
    }

    @PostMapping
    public ResponseEntity<?> createReview(
            @PathVariable String productId,
            @RequestBody ReviewRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdStr,
            @RequestHeader(value = "X-User-DisplayName", required = false) String displayName,
            @RequestHeader(value = "X-User-Name", required = false) String username,
            @RequestHeader(value = "X-User-Email", required = false) String userEmail
    ) {
        if (userIdStr == null || userIdStr.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bạn chưa đăng nhập"));
        }
        
        Long userId;
        try {
            userId = Long.valueOf(userIdStr);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Token không hợp lệ"));
        }

        String nameStr = "Khách hàng";
        if (displayName != null && !displayName.isBlank()) {
            nameStr = displayName;
        } else if (username != null && !username.isBlank()) {
            nameStr = username;
        } else if (userEmail != null && !userEmail.isBlank()) {
            nameStr = userEmail.split("@")[0];
        }

        if (reviewRepository.existsByProductIdAndUserId(productId, userId)) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", "Bạn đã đánh giá sản phẩm này rồi"));
        }

        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("error", "Đánh giá phải từ 1 đến 5 sao"));
        }

        Review review = new Review();
        review.setProductId(productId);
        review.setUserId(userId);
        review.setUsername(nameStr);
        review.setRating(request.getRating());
        review.setComment(request.getComment());
        reviewRepository.save(review);

        updateProductRating(productId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Đã lưu đánh giá thành công"));
    }

    @PutMapping
    public ResponseEntity<?> updateReview(
            @PathVariable String productId,
            @RequestBody ReviewRequest request,
            @RequestHeader(value = "X-User-Id", required = false) String userIdStr
    ) {
        if (userIdStr == null || userIdStr.isBlank()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Bạn chưa đăng nhập"));
        }
        
        Long userId;
        try {
            userId = Long.valueOf(userIdStr);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Token không hợp lệ"));
        }

        if (request.getRating() == null || request.getRating() < 1 || request.getRating() > 5) {
            return ResponseEntity.badRequest().body(Map.of("error", "Đánh giá phải từ 1 đến 5 sao"));
        }

        return reviewRepository.findByProductIdAndUserId(productId, userId)
            .map(review -> {
                review.setRating(request.getRating());
                review.setComment(request.getComment());
                reviewRepository.save(review);
                updateProductRating(productId);
                return ResponseEntity.ok(Map.of("message", "Cập nhật đánh giá thành công"));
            })
            .orElse(ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Không tìm thấy đánh giá của bạn")));
    }

    private void updateProductRating(String productId) {
        Double avg = reviewRepository.getAverageRating(productId);
        Long count = reviewRepository.countByProductId(productId);
        productRepository.findByProductId(productId).ifPresent(p -> {
            p.setRating(avg != null ? Math.round(avg * 10.0) / 10.0 : 0.0);
            p.setNumReviews(count != null ? count.intValue() : 0);
            productRepository.save(p);
        });
    }
}
