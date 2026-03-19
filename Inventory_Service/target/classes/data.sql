INSERT INTO products (product_id, name, stock, price) VALUES
('sp001', 'Ao thun basic', 100, 99000),
('sp002', 'Quan jean slim', 80, 299000),
('sp003', 'Giay sneaker', 45, 799000)
ON DUPLICATE KEY UPDATE
name = VALUES(name),
stock = VALUES(stock),
price = VALUES(price);