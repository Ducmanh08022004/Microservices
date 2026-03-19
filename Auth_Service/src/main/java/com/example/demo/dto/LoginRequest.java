package com.example.demo.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Getter
@Setter
/**
 * DTO request cho API đăng nhập.
 */
public class LoginRequest {
    private String username;
    private String password;
}
