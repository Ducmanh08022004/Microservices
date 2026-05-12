package com.example.demo;

import com.example.demo.dto.ForgotPasswordRequest;
import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import com.example.demo.dto.ResetPasswordRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
/**
 * Controller xử lý các API xác thực: đăng nhập và đăng ký.
 */
public class AuthController {

    private static final int RESET_CODE_TTL_MINUTES = 3;
    private static final int MAX_RESET_ATTEMPTS = 5;
    private static final String ADMIN_SUPPORT_EMAIL = "truongducmanh08022004@gmail.com";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final NotificationEmailPublisher notificationEmailPublisher;
    private final RestTemplate restTemplate;

    @org.springframework.beans.factory.annotation.Value("${inventory.base-url:http://localhost:8080}")
    private String inventoryBaseUrl;

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

    @PostMapping("/forgot-password/request")
    public ResponseEntity<?> requestPasswordReset(@RequestBody ForgotPasswordRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tên đăng nhập không được để trống"));
        }

        return userRepository.findByUsername(request.getUsername().trim()).map(user -> {
            if (!Boolean.TRUE.equals(user.getIsEnabled())) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Tài khoản của bạn đang bị khóa. Vui lòng yêu cầu hỗ trợ mở khóa."
                ));
            }

            String code = String.format("%06d", ThreadLocalRandom.current().nextInt(1_000_000));
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(RESET_CODE_TTL_MINUTES);
            user.setResetPasswordCodeHash(passwordEncoder.encode(code));
            user.setResetPasswordCodeExpiresAt(expiresAt);
            user.setResetPasswordFailedAttempts(0);
            userRepository.save(user);

            notificationEmailPublisher.send(
                    user.getEmail(),
                    "Mã xác nhận đặt lại mật khẩu",
                    buildResetOtpEmail(user, code, expiresAt)
            );

                long expiresAtEpochMillis = expiresAt.atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();
                long expiresInSeconds = Math.max(0, (expiresAtEpochMillis - System.currentTimeMillis()) / 1000);
            return ResponseEntity.ok(Map.of(
                    "message", "Mã xác nhận đã được gửi tới email của bạn.",
                    "expiresAtEpochMillis", expiresAtEpochMillis,
                    "expiresInSeconds", Math.max(expiresInSeconds, 0)
            ));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Không tìm thấy tài khoản theo tên đăng nhập này")));
    }

    @PostMapping("/forgot-password/confirm")
    public ResponseEntity<?> confirmPasswordReset(@RequestBody ResetPasswordRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank() ||
                request.getCode() == null || request.getCode().isBlank() ||
                request.getNewPassword() == null || request.getNewPassword().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Thiếu dữ liệu xác nhận"));
        }

        return userRepository.findByUsername(request.getUsername().trim()).map(user -> {
            if (!Boolean.TRUE.equals(user.getIsEnabled())) {
                return ResponseEntity.status(403).body(Map.of(
                        "error", "Tài khoản của bạn đang bị khóa. Vui lòng yêu cầu hỗ trợ mở khóa.",
                        "locked", true
                ));
            }

            LocalDateTime expiresAt = user.getResetPasswordCodeExpiresAt();
            String storedCode = user.getResetPasswordCodeHash();

            if (expiresAt == null || storedCode == null || expiresAt.isBefore(LocalDateTime.now())) {
                return ResponseEntity.status(400).body(Map.of("error", "Mã xác nhận đã hết hạn, vui lòng yêu cầu mã mới"));
            }

            if (!passwordEncoder.matches(request.getCode().trim(), storedCode)) {
                int failedAttempts = user.getResetPasswordFailedAttempts() == null ? 0 : user.getResetPasswordFailedAttempts();
                failedAttempts++;
                user.setResetPasswordFailedAttempts(failedAttempts);

                if (failedAttempts >= MAX_RESET_ATTEMPTS) {
                    user.setIsEnabled(false);
                    user.setResetPasswordCodeHash(null);
                    user.setResetPasswordCodeExpiresAt(null);
                    userRepository.save(user);

                    return ResponseEntity.status(423).body(Map.of(
                            "error", "Nhập sai quá 5 lần. Tài khoản đã bị khóa, vui lòng yêu cầu hỗ trợ mở khóa.",
                            "locked", true,
                            "attemptsLeft", 0
                    ));
                }

                userRepository.save(user);
                return ResponseEntity.status(400).body(Map.of(
                    "error", "Mã xác nhận không chính xác",
                    "attemptsLeft", Math.max(0, MAX_RESET_ATTEMPTS - failedAttempts)
                ));
            }

            user.setPassword(passwordEncoder.encode(request.getNewPassword()));
            user.setResetPasswordCodeHash(null);
            user.setResetPasswordCodeExpiresAt(null);
            user.setResetPasswordFailedAttempts(0);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("message", "Đặt lại mật khẩu thành công"));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Không tìm thấy tài khoản theo tên đăng nhập này")));
    }

    @PostMapping("/forgot-password/support")
    public ResponseEntity<?> requestSupportUnlock(@RequestBody ForgotPasswordRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tên đăng nhập không được để trống"));
        }

        return userRepository.findByUsername(request.getUsername().trim()).map(user -> {
            String content = buildSupportUnlockEmail(user);
            notificationEmailPublisher.send(ADMIN_SUPPORT_EMAIL, "Yêu cầu mở khóa tài khoản", content);
            return ResponseEntity.ok(Map.of("message", "Đã gửi yêu cầu hỗ trợ đến quản trị viên."));
        }).orElse(ResponseEntity.status(404).body(Map.of("error", "Không tìm thấy tài khoản theo tên đăng nhập này")));
    }

    private String buildResetOtpEmail(User user, String code, LocalDateTime expiresAt) {
        return """
                <div style="font-family: Arial, sans-serif; background: #f7fafc; padding: 24px; color: #1f2937;">
                  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e5e7eb;">
                    <h2 style="margin: 0 0 12px; font-size: 24px; color: #0f766e;">Xác nhận đặt lại mật khẩu</h2>
                    <p style="margin: 0 0 12px; line-height: 1.7;">Xin chào <strong>%s</strong>, chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                    <p style="margin: 0 0 10px; line-height: 1.7;">Mã xác nhận của bạn là:</p>
                    <div style="display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 6px; padding: 14px 20px; border-radius: 14px; background: #ecfeff; color: #0f766e;">%s</div>
                    <p style="margin: 16px 0 0; line-height: 1.7;">Mã có hiệu lực trong <strong>3 phút</strong> và sẽ hết hạn lúc <strong>%s</strong>.</p>
                    <p style="margin: 12px 0 0; line-height: 1.7; color: #6b7280;">Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email.</p>
                  </div>
                </div>
                """.formatted(user.getUsername(), code, expiresAt.toString());
    }

    private String buildSupportUnlockEmail(User user) {
        return """
                <div style="font-family: Arial, sans-serif; background: #fff7ed; padding: 24px; color: #1f2937;">
                  <div style="max-width: 640px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #fed7aa;">
                    <h2 style="margin: 0 0 12px; font-size: 24px; color: #c2410c;">Yêu cầu mở khóa tài khoản</h2>
                    <p style="margin: 0 0 12px; line-height: 1.7;">Một người dùng đã yêu cầu hỗ trợ mở khóa tài khoản sau khi nhập sai mã xác nhận quá 5 lần.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 12px;">
                      <tr><td style="padding: 8px 0; width: 180px; font-weight: 700;">Tên đăng nhập</td><td style="padding: 8px 0;">%s</td></tr>
                      <tr><td style="padding: 8px 0; font-weight: 700;">Email</td><td style="padding: 8px 0;">%s</td></tr>
                      <tr><td style="padding: 8px 0; font-weight: 700;">Trạng thái</td><td style="padding: 8px 0; color: #b91c1c;">Đã khóa</td></tr>
                    </table>
                    <p style="margin: 16px 0 0; line-height: 1.7;">Vui lòng đăng nhập vào hệ thống quản trị và mở khóa tài khoản nếu xác minh phù hợp.</p>
                  </div>
                </div>
                """.formatted(user.getUsername(), user.getEmail());
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

                syncReviewDisplayName(user.getId(), user.getDisplayName());

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

    private void syncReviewDisplayName(int userId, String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return;
        }

        try {
            restTemplate.put(
                    inventoryBaseUrl + "/internal/reviews/display-name",
                    Map.of("userId", String.valueOf(userId), "displayName", displayName)
            );
        } catch (Exception ignored) {
            // Profile update still succeeds even if review sync is temporarily unavailable.
        }
    }
}
