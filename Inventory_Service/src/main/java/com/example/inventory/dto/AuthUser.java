package com.example.inventory.dto;

/**
 * DTO chứa thông tin người dùng đã xác thực từ JWT.
 */
public class AuthUser {
    private Long id;
    private String email;

    public AuthUser(Long id, String email) {
        this.id = id;
        this.email = email;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }
}
