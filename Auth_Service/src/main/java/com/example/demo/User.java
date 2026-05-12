package com.example.demo;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;


@Entity
@Table(name = "user", indexes = {
    @Index(name = "idx_user_role_enabled", columnList = "role, is_enabled")
})
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
/**
 * Entity người dùng lưu thông tin tài khoản trong bảng user.
 */
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "username")
    private String username;

    @Column(name = "password")
    private String password;

    @Column(name = "role")
    private String role;

    @Column(name = "email")
    private String email;

    @Column(name = "is_enabled", nullable = false, columnDefinition = "boolean default true")
    @Builder.Default
    private Boolean isEnabled = true;

    @Column(name = "display_name", unique = true)
    private String displayName;

    @Column(name = "reset_password_code_hash")
    private String resetPasswordCodeHash;

    @Column(name = "reset_password_code_expires_at")
    private LocalDateTime resetPasswordCodeExpiresAt;

    @Column(name = "reset_password_failed_attempts", nullable = false)
    @Builder.Default
    private Integer resetPasswordFailedAttempts = 0;
}
