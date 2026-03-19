package com.example.inventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
/**
 * Điểm khởi động của ứng dụng Spring Boot cho service kho.
 */
public class InventoryServiceApplication {

    /**
     * Hàm main để boot toàn bộ context Spring.
     *
     * Input:
     * - args: tham số dòng lệnh khi chạy ứng dụng.
     *
     * Output:
     * - Không trả về giá trị; side effect là ứng dụng web được khởi chạy.
     */
    public static void main(String[] args) {
        SpringApplication.run(InventoryServiceApplication.class, args);
    }
}