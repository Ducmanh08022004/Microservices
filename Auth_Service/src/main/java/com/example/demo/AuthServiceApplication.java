package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
/**
 * Điểm khởi động của Auth Service.
 */
public class AuthServiceApplication {

	/**
	 * Boot ứng dụng Spring Boot cho module xác thực.
	 *
	 * Input:
	 * - args: tham số dòng lệnh khi chạy ứng dụng.
	 *
	 * Output:
	 * - Không trả về giá trị; side effect là khởi tạo toàn bộ context.
	 */
	public static void main(String[] args) {
		SpringApplication.run(AuthServiceApplication.class, args);
	}

}
