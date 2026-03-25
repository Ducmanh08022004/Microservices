package com.example.demo;

import com.example.demo.dto.LoginRequest;
import com.example.demo.dto.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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
    public String login(@RequestBody LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsername(),
                        request.getPassword()
                )
        );

        User user = userRepository.findByUsername(request.getUsername()).orElseThrow();

        return jwtService.generateToken(user);
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
                .build());
    }
}
