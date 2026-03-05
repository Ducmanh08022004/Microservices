require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sequelize = require('./db');
const productController = require('./controllers/productController');
const authMiddleware = require('./middleware/authMiddleware');
const producer = require('./kafkaProducer');
const startConsumer = require('./kafkaConsumer');

const app = express();
app.use(express.json());
app.use(cors());

// --- KHAI BÁO CÁC ROUTE (Chỉ trỏ đến Controller) ---

// User routes
app.get('/api/products', productController.getAllProducts);

// Admin routes
app.post('/admin/products',authMiddleware, productController.createProduct);
app.put('/admin/products/:product_id', productController.updateStock);
app.get('/api/products/:id', productController.getProductById);
app.post('/api/products/check-stock', authMiddleware, productController.checkStock);

const PORT = process.env.PORT || 3002;

// Đồng bộ DB và Chạy Server
// Chuyển thành async () để dùng được await bên trong
sequelize.sync({ alter: true }).then(async () => {
    console.log("🛠️  Database synced");
    
    try {
        // BẬT CÔNG TẮC KAFKA TẠI ĐÂY
        await producer.connect();
        console.log("📡 Kafka Producer đã kết nối sẵn sàng gửi tin!");
        
        startConsumer(); // Khởi động tai nghe chạy ngầm

        // Sau khi DB và Kafka đều ổn, mới mở cửa đón khách (bật app.listen)
        app.listen(PORT, () => {
            console.log(`🚀 Service Kho chạy tại: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error("❌ Lỗi khi khởi động hệ thống Kafka:", error);
    }
});