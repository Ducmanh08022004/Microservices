USE order_db;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255),
    quantity INT,
    total_price DOUBLE,
    status VARCHAR(50),
    created_at DATETIME,
    updated_at DATETIME,
    UNIQUE KEY idx_order_id (order_id)
);

CREATE INDEX idx_status ON orders(status);

CREATE INDEX idx_user_created
ON orders(user_id, created_at DESC);

CREATE INDEX idx_user_status_created
ON orders(user_id, status, created_at);