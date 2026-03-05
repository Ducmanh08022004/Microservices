const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // 1. Lấy token từ Header (Authorization: Bearer <token>)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Bạn chưa đăng nhập!" });

    // 2. Giải mã Token
    // Lưu ý: 'CHUO_BI_MAT_CHUNG' phải giống hệt bên Service Auth
    jwt.verify(token, process.env.JWT_SECRET || 'project_microservices_myscret_token_token_1234567789', (err, user) => {
        if (err) return res.status(403).json({ error: "Token không hợp lệ hoặc hết hạn!" });
        
        // 3. Nếu đúng, lưu thông tin người dùng vào request để dùng ở Controller
        req.user = user; 
        next(); // Cho phép đi tiếp vào Controller
    });
};