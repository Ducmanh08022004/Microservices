USE kho_db;

CREATE TABLE IF NOT EXISTS categories (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    icon VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    product_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    stock INT DEFAULT 0,
    price DOUBLE DEFAULT 0.0,
    image_url VARCHAR(500),
    description TEXT,
    brand VARCHAR(255),
    sku VARCHAR(100),
    discount_price DOUBLE,
    status VARCHAR(50) DEFAULT 'IN_STOCK',
    rating DOUBLE DEFAULT 0.0,
    num_reviews INT DEFAULT 0,
    category_id BIGINT,
    createdAt DATETIME,
    updatedAt DATETIME,

    UNIQUE KEY idx_product_id (product_id),
    FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE INDEX idx_product_stock ON products(product_id, stock);
CREATE INDEX idx_product_category ON products(category_id);
CREATE INDEX idx_product_status_created ON products(status, createdAt);

-- Thêm một số danh mục mẫu
INSERT IGNORE INTO categories (name, description) VALUES ('Điện thoại', 'Các dòng smartphone mới nhất');
INSERT IGNORE INTO categories (name, description) VALUES ('Laptop', 'Máy tính xách tay làm việc và chơi game');
INSERT IGNORE INTO categories (name, description) VALUES ('Phụ kiện', 'Tai nghe, sạc, ốp lưng');