package com.example.demo;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
/**
 * Controller xử lý các API xác thực: đăng nhập và đăng ký.
 */
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Đăng nhập người dùng và trả JWT token.
     *
     * Input:
     * - request: username và password.
     *
     * Output:
     * - Chuỗi JWT token nếu xác thực thành công.
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getUsername(),
                            request.getPassword()
                    )
            );

            User user = userRepository.findByUsername(request.getUsername()).orElseThrow();
            String token = jwtService.generateToken(user);
            String refreshToken = jwtService.generateRefreshToken(user);
            return ResponseEntity.ok(Map.of(
                    "accessToken", token,
                    "refreshToken", refreshToken
            ));
        } catch (org.springframework.security.authentication.DisabledException e) {
            return ResponseEntity.status(403).body(Map.of("error", "Tài khoản của bạn đã bị khóa!"));
        } catch (org.springframework.security.authentication.BadCredentialsException e) {
            return ResponseEntity.status(401).body(Map.of("error", "Sai tài khoản hoặc mật khẩu!"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", "Lỗi server: " + e.getMessage()));
        }
    }

    /**
     * Đăng ký tài khoản mới vào hệ thống.
     *
     * Input:
     * - request: thông tin username/password/email.
     *
     * Output:
     * - Không trả body; side effect là thêm user mới vào DB.
     */
    @PostMapping("/register")
    public void register(@RequestBody RegisterRequest request)
    {
        userRepository.save(User.builder()
                .email(request.getEmail())
                .username(request.getUsername())
                .password(passwordEncoder.encode(request.getPassword()))
                .role("USER")
                .displayName(request.getUsername()) // Default to username if not provided
                .isEnabled(true)
                .build());
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        if (refreshToken == null) return ResponseEntity.badRequest().build();
        try {
            String username = jwtService.extractUsername(refreshToken);
            User user = userRepository.findByUsername(username).orElseThrow();
            return ResponseEntity.ok(Map.of(
                    "accessToken", jwtService.generateToken(user),
                    "refreshToken", jwtService.generateRefreshToken(user)
            ));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("error", "Refresh token is expired or invalid"));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe(
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            @RequestHeader(value = "X-User-Email", required = false) String xUserEmail,
            @RequestHeader(value = "X-User-Role", required = false) String xUserRole
    ) {
        // Gateway đã xác thực JWT và inject các header X-User-*
        if (xUserId == null || xUserId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn chưa đăng nhập!"));
        }
        try {
            Long userId = Long.valueOf(xUserId);
            return userRepository.findById(userId.intValue())
                    .map(user -> ResponseEntity.ok(Map.of(
                            "id",        user.getId(),
                            "username",  user.getUsername(),
                            "displayName", user.getDisplayName() != null ? user.getDisplayName() : "",
                            "email",     user.getEmail() != null ? user.getEmail() : "",
                            "role",      user.getRole(),
                            "isEnabled", user.getIsEnabled()
                    )))
                    .orElse(ResponseEntity.notFound().build());
        } catch (NumberFormatException e) {
            return ResponseEntity.status(400).body(Map.of("error", "X-User-Id không hợp lệ"));
        }
    }

    @GetMapping("/admin/users")
    public Page<User> listUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String query,
            @RequestParam(required = false) String role,
            @RequestParam(required = false, name = "isEnabled") Boolean isEnabled,
            @RequestHeader(value = "X-User-Role", required = false) String userRole) {
        
        if (query != null || role != null || isEnabled != null) {
            return userRepository.searchUsers(query, role, isEnabled, PageRequest.of(page, size));
        }
        return userRepository.findAll(PageRequest.of(page, size));
    }

    @PutMapping("/admin/users/{id}/toggle-status")
    public ResponseEntity<?> toggleStatus(@PathVariable Integer id) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setIsEnabled(!user.getIsEnabled());
            userRepository.save(user);
            return ResponseEntity.ok(Map.of("message", "Status updated", "isEnabled", user.getIsEnabled()));
        }
        return ResponseEntity.notFound().build();
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<?> getStats(
            @RequestHeader(value = "X-User-Role", required = false) String role
    ) {
        if (!"ADMIN".equalsIgnoreCase(role)) {
            return ResponseEntity.status(403).body(Map.of("error", "Access denied"));
        }
        return ResponseEntity.ok(Map.of("total_users", userRepository.count()));
    }

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            @RequestBody Map<String, String> updates
    ) {
        if (xUserId == null || xUserId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("error", "Bạn chưa đăng nhập!"));
        }
        Long userId = Long.valueOf(xUserId);
        return userRepository.findById(userId.intValue()).map(user -> {
            try {
                if (updates.containsKey("email")) {
                    user.setEmail(updates.get("email"));
                }
                if (updates.containsKey("displayName") && !updates.get("displayName").isBlank()) {
                    user.setDisplayName(updates.get("displayName"));
                }
                if (updates.containsKey("password") && !updates.get("password").isBlank()) {
                    user.setPassword(passwordEncoder.encode(updates.get("password")));
                }
                userRepository.save(user);

                String newToken = jwtService.generateToken(user);
                String newRefreshToken = jwtService.generateRefreshToken(user);

                return ResponseEntity.ok(Map.of(
                        "message", "Cập nhật thành công!",
                        "accessToken", newToken,
                        "refreshToken", newRefreshToken
                ));
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                return ResponseEntity.badRequest().body(Map.of("error", "Tên hiển thị này đã có người sử dụng, vui lòng chọn tên khác!"));
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(Map.of("error", "Lỗi lưu dữ liệu: " + e.getMessage()));
            }
        }).orElse(ResponseEntity.notFound().build());
    }
}
