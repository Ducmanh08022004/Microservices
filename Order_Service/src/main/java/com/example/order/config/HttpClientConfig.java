package com.example.order.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;

@Configuration
public class HttpClientConfig {

    @Bean
    RestTemplate restTemplate(
            RestTemplateBuilder builder,
            @Value("${inventory.client.connect-timeout:2s}") Duration connectTimeout,
            @Value("${inventory.client.read-timeout:3s}") Duration readTimeout
    ) {
        return builder
                .setConnectTimeout(connectTimeout)
                .setReadTimeout(readTimeout)
                .build();
    }
}
