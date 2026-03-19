USE auth_db;

CREATE TABLE IF NOT EXISTS user (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255),
    password VARCHAR(255),
    role VARCHAR(50),
    email VARCHAR(255),

    -- INDEX
    UNIQUE KEY idx_username (username),
    UNIQUE KEY idx_email (email)
);