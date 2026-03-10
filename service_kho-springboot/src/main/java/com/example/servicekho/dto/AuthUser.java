package com.example.servicekho.dto;

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
