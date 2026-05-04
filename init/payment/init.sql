USE payment_db;

CREATE TABLE IF NOT EXISTS payments (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    payment_id  VARCHAR(255) NOT NULL UNIQUE,
    order_id    VARCHAR(255) NOT NULL,
    user_id     BIGINT       NOT NULL,
    amount      DOUBLE       NOT NULL,
    status      VARCHAR(50)  NOT NULL COMMENT 'PROCESSING | PAID | PAYMENT_FAILED',
    payment_method VARCHAR(50) DEFAULT 'MOCK' COMMENT 'MOCK | VNPAY',
    vnp_txn_ref    VARCHAR(255) NULL COMMENT 'Mã tham chiếu gửi sang VNPay',
    vnp_transaction_no VARCHAR(255) NULL COMMENT 'Mã giao dịch VNPay trả về',
    vnp_bank_code  VARCHAR(50) NULL COMMENT 'Ngân hàng thanh toán',
    created_at  DATETIME     NOT NULL,
    updated_at  DATETIME     NOT NULL,
    INDEX idx_order_id (order_id),
    UNIQUE INDEX idx_vnp_txn_ref (vnp_txn_ref)
);
