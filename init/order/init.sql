USE order_db;

CREATE TABLE IF NOT EXISTS orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id VARCHAR(255) NOT NULL,
    user_id BIGINT NOT NULL,
    product_id VARCHAR(255) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL,
    total_price DOUBLE NOT NULL,
    coupon_code VARCHAR(255),
    image_url VARCHAR(512),
    status VARCHAR(50) NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,

    UNIQUE KEY idx_order_id (order_id)
);

CREATE INDEX idx_status ON orders(status);
CREATE INDEX idx_user_created ON orders(user_id, created_at DESC);
CREATE INDEX idx_user_status_created ON orders(user_id, status, created_at);
CREATE INDEX idx_order_status_created ON orders(status, created_at);

CREATE TABLE IF NOT EXISTS coupons (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,
    type VARCHAR(50) NOT NULL,
    category_name VARCHAR(100),
    value DOUBLE NOT NULL,
    min_order_value DOUBLE,
    max_usage INT,
    max_discount_amount DOUBLE,
    used_count INT DEFAULT 0,
    expires_at DATETIME,
    is_active TINYINT(1) DEFAULT 1
);

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS category_name VARCHAR(100);
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS max_discount_amount DOUBLE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code VARCHAR(255);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS image_url VARCHAR(512);

ALTER TABLE coupons ADD COLUMN IF NOT EXISTS owner_user_id BIGINT DEFAULT NULL;
ALTER TABLE coupons ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP;
CREATE INDEX idx_coupon_owner_date ON coupons(owner_user_id, created_at);
