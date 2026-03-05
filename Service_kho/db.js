require('dotenv').config(); // Phải có dòng này để đọc file .env
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: process.env.DB_DIALECT,
        logging: false, // Để console đỡ rối khi chạy lệnh SQL
    }
);

// Kiểm tra kết nối
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Kết nối Database thành công (Inventory Service)');
    } catch (error) {
        console.error('❌ Không thể kết nối Database:', error);
    }
};

testConnection();

module.exports = sequelize;