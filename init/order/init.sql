USE order_db;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    total_price DOUBLE NOT NULL,
    status VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    -- UNIQUE
    UNIQUE KEY idx_order_id (order_id)
);

-- INDEX cơ bản
CREATE INDEX idx_status ON orders(status);

-- Query: lịch sử đơn hàng
CREATE INDEX idx_user_created
ON orders(user_id, created_at DESC);

-- Query nâng cao (lọc + sort)
CREATE INDEX idx_user_status_created
ON orders(user_id, status, created_at);