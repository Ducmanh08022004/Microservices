package com.example.inventory.controller;

import com.example.inventory.repository.ReviewRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/internal/reviews")
public class InternalReviewSyncController {

    private final ReviewRepository reviewRepository;

    public InternalReviewSyncController(ReviewRepository reviewRepository) {
        this.reviewRepository = reviewRepository;
    }

    @PutMapping("/display-name")
    @Transactional
    public ResponseEntity<?> syncDisplayName(@RequestBody Map<String, String> body) {
        String userIdStr = body.get("userId");
        String displayName = body.get("displayName");

        if (userIdStr == null || userIdStr.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId is required"));
        }

        if (displayName == null || displayName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "displayName is required"));
        }

        try {
            Long userId = Long.valueOf(userIdStr);
            int updatedRows = reviewRepository.updateUsernameByUserId(userId, displayName.trim());
            return ResponseEntity.ok(Map.of(
                    "message", "Da dong bo ten hien thi cho review",
                    "updatedRows", updatedRows
            ));
        } catch (NumberFormatException ex) {
            return ResponseEntity.badRequest().body(Map.of("error", "userId invalid"));
        }
    }
}