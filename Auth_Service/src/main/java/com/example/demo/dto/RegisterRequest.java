package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@AllArgsConstructor
/**
 * DTO request cho API đăng ký tài khoản mới.
 */
public class RegisterRequest {
    private String username;
    private String password;
    private String email;
    private String role="user";
}
