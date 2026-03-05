// redisClient.js
const redis = require('redis');

// Khởi tạo client
const client = redis.createClient({
    // Nếu bạn chạy Redis bằng Docker hoặc cài trực tiếp trên máy, 
    // mặc định sẽ là localhost:6379
    url: 'redis://localhost:6379' 
});

// Bắt lỗi nếu Redis chưa bật
client.on('error', (err) => console.log('❌ Redis Client Error', err));

// Kết nối
(async () => {
    await client.connect();
    console.log('✅ Đã kết nối thành công tới Redis!');
})();

module.exports = client;