CREATE TABLE IF NOT EXISTS payments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id  VARCHAR(255) NOT NULL UNIQUE,
    order_id    VARCHAR(255) NOT NULL,
    user_id     BIGINT       NOT NULL,
    amount      DOUBLE       NOT NULL,
    status      VARCHAR(50)  NOT NULL COMMENT 'PROCESSING | PAID | PAYMENT_FAILED',
    created_at  DATETIME     NOT NULL,
    updated_at  DATETIME     NOT NULL,
    INDEX idx_order_id (order_id)
);
