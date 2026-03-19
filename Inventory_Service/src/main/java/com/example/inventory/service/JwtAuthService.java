package com.example.inventory.service;

import com.example.inventory.dto.AuthUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Optional;

@Service
/**
 * Service parse JWT từ header Authorization để lấy thông tin người dùng.
 */
public class JwtAuthService {

    @Value("${app.jwt-secret:project_microservices_myscret_token_token_1234567789}")
    private String jwtSecret;

    /**
     * Parse bearer token và trích xuất userId/email.
     *
     * Input:
     * - authHeader: giá trị header Authorization (dạng "Bearer <token>").
     *
     * Output:
     * - Optional<AuthUser>: rỗng nếu token không hợp lệ hoặc thiếu thông tin.
     */
    public Optional<AuthUser> parseBearerToken(String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return Optional.empty();
        }

        String token = authHeader.substring(7);
        try {
            Claims claims = Jwts.parserBuilder()
                    .setSigningKey(jwtSecret.getBytes(StandardCharsets.UTF_8))
                    .build()
                    .parseClaimsJws(token)
                    .getBody();
            Object idClaim = claims.get("userId");
            if (idClaim == null) {
                idClaim = claims.get("id");
            }
            Long userId = idClaim == null ? null : Long.valueOf(idClaim.toString());
            String email = claims.get("email", String.class);
            if ((email == null || email.isBlank())) {
                email = claims.get("username", String.class);
            }

            if (userId == null) {
                return Optional.empty();
            }
            return Optional.of(new AuthUser(userId, email));
        } catch (Exception ex) {
            return Optional.empty();
        }
    }
}
