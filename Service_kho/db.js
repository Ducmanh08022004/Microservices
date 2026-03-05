require('dotenv').config(); // Phải có dòng này để đọc file .env
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'kho_db', 
    process.env.DB_USER || 'root', 
    process.env.DB_PASSWORD || 'root', 
    {
        host: process.env.DB_HOST || 'mysql_kho',
        port: process.env.DB_PORT || 3308,
        dialect: process.env.DB_DIALECT || 'mysql',
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