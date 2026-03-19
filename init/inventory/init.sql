USE kho_db;

CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    stock INT,
    price DOUBLE,
    createdAt DATETIME,
    updatedAt DATETIME,
    UNIQUE KEY idx_product_id (product_id)
);


CREATE INDEX idx_product_stock
ON products(product_id, stock);