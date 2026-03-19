package com.example.demo;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
/**
 * Service tạo JWT token phục vụ xác thực giữa các service.
 */
public class JwtService {

    /**
     * Tạo JWT từ thông tin user.
     *
     * Input:
     * - user: thực thể User chứa id, username, role, email.
     *
     * Output:
     * - Chuỗi token có thời hạn 1 giờ.
     */
    public String generateToken(User user) {
        String SECRET_KEY = "project_microservices_myscret_token_token_1234567789";
        return Jwts.builder()
                .setSubject(user.getUsername())
                .claim("userId", user.getId())
                .claim("role", user.getRole())
                .claim("email",user.getEmail())
                .claim("username",user.getUsername())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + 1000 * 60 * 60))
                .signWith(Keys.hmacShaKeyFor(SECRET_KEY.getBytes()))
                .compact();
    }
}
