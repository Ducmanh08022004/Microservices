package com.example.demo.config;

import com.example.demo.User;
import com.example.demo.UserRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class InitConfig {

    private final PasswordEncoder passwordEncoder;

    public InitConfig(PasswordEncoder passwordEncoder) {
        this.passwordEncoder = passwordEncoder;
    }

    @Bean
    ApplicationRunner applicationRunner (UserRepository userRepository) {
        return args -> {
            userRepository.findByUsername("admin").ifPresentOrElse(
                user -> {
                    user.setPassword(passwordEncoder.encode("admin"));
                    user.setIsEnabled(true);
                    user.setRole("ADMIN");
                    userRepository.save(user);
                },
                () -> {
                    User user = new User();
                    user.setUsername("admin");
                    user.setRole("ADMIN");
                    user.setIsEnabled(true);
                    user.setPassword(passwordEncoder.encode("admin"));
                    userRepository.save(user);
                }
            );
        };
    }
}

