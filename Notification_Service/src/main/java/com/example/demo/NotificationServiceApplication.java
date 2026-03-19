package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableKafka
@EnableAsync
/**
 * Điểm khởi động của Notification Service (Kafka + gửi email bất đồng bộ).
 */
public class NotificationServiceApplication {

	/**
	 * Boot ứng dụng Notification Service.
	 *
	 * Input:
	 * - args: tham số dòng lệnh khi chạy ứng dụng.
	 *
	 * Output:
	 * - Không trả về giá trị; side effect là khởi tạo context.
	 */
	public static void main(String[] args) {
		SpringApplication.run(NotificationServiceApplication.class, args);
	}

}
