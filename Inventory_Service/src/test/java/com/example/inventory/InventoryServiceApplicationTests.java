package com.example.inventory;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
/**
 * Kiểm thử smoke test để xác nhận Spring context khởi tạo thành công.
 */
class InventoryServiceApplicationTests {

    @Test
    /**
     * Không có input/output; test pass nếu contextLoads không ném exception.
     */
    void contextLoads() {
    }

}