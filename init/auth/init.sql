USE auth_db;

CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    is_enabled TINYINT(1) DEFAULT 1,
    display_name VARCHAR(255) UNIQUE,
    reset_password_code_hash VARCHAR(255),
    reset_password_code_expires_at DATETIME,
    reset_password_failed_attempts INT DEFAULT 0,

    -- INDEX
    UNIQUE KEY idx_username (username),
    UNIQUE KEY idx_email (email)
);

CREATE INDEX idx_user_role_enabled ON user(role, is_enabled);

-- Thêm user Admin mặc định nếu chưa có (mật khẩu là 'admin' đã được mã hóa BCrypt hoặc dùng plain if not using security, but project uses BCrypt)
-- Lưu ý: Mật khẩu '$2a$10$8.UnVuG9HHgffUDAlk8q6uy5akLPNndzqBzv6v8.6bUe6n9jW5S.' là 'admin123'
INSERT IGNORE INTO user (username, password, role, email, is_enabled, display_name) 
VALUES ('admin', '$2a$10$8.UnVuG9HHgffUDAlk8q6uy5akLPNndzqBzv6v8.6bUe6n9jW5S.', 'ADMIN', 'admin@example.com', 1, 'Quản trị viên');