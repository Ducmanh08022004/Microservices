const { parse } = require('dotenv');
const Product = require('../Product');
const redisClient =require('../redisClient');   
// const producer = require('../kafkaClient');
const producer = require('../kafkaProducer');
// Lấy danh sách sản phẩm
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll();
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin thêm sản phẩm
exports.createProduct = async (req, res) => {
    try {
        const { product_id, name, stock, price } = req.body;
        const newProduct = await Product.create({ product_id, name, stock, price });
        res.status(201).json({ message: "Tạo thành công", data: newProduct });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Admin cập nhật kho
exports.updateStock = async (req, res) => {
    try {
        const { product_id } = req.params;
        const { stock } = req.body;
        const product = await Product.findOne({ where: { product_id } });
        
        if (product) {
            product.stock = stock;
            await product.save(); // Lưu DB

            // THÊM 2 DÒNG NÀY ĐỂ ĐỒNG BỘ REDIS
            const redisKey = `stock:${product_id}`;
            await redisClient.setEx(redisKey, 3600, stock.toString()); 

            res.json({ message: "Cập nhật thành công", data: product });
        } else {
            res.status(404).json({ error: "Không thấy sản phẩm" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
exports.getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        // Chú ý: React gửi param là id, nhưng DB của bạn lưu cột là product_id
        const product = await Product.findOne({ where: { product_id: id } });
        
        if (product) {
            res.json(product);
        } else {
            res.status(404).json({ error: "Không tìm thấy sản phẩm" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Kiểm tra số lượng tồn kho (Phục vụ nút "Mua hàng" cột phải)
exports.checkStock = async (req, res) => {
    try {
        // 1. FE CHỈ GỬI ID VÀ SỐ LƯỢNG (Bảo mật tuyệt đối)
        const { productId, quantity } = req.body;
        const userId = req.user.id; // Lấy từ Token
        const userEmail = req.user.email;
        const qty = parseInt(quantity, 10);

        // Chúng ta có 2 chìa khóa Redis
        const stockKey = `stock:${productId}`;
        const infoKey = `info:${productId}`; // Chìa khóa chứa Tên và Giá

        // 2. Hỏi Redis trước
        const cachedStock = await redisClient.get(stockKey);
        const cachedInfo = await redisClient.get(infoKey); // Lấy tên và giá từ bộ nhớ đệm
        
        // --- NẾU REDIS CÓ SẴN DỮ LIỆU ---
        if (cachedStock !== null && cachedInfo !== null) {
            const stockIntRedis = parseInt(cachedStock, 10);
            
            if (stockIntRedis >= qty) {
                // Đủ hàng -> Trừ kho trên RAM
                await redisClient.decrBy(stockKey, qty);
                
                // Giải mã thông tin (Tên, Giá) Backend đã cất từ trước
                const productInfo = JSON.parse(cachedInfo);
                const totalPrice = productInfo.price * qty; // Tự tính tiền, không tin FE

                // Bắn gói tin ĐẦY ĐỦ lên Kafka
                await producer.send({
                    topic: 'order',
                    messages: [
                        { value: JSON.stringify({ 
                            userId, 
                            productId, 
                            name: productInfo.name, 
                            quantity: qty, 
                            totalPrice, 
                            status: 'PENDING_UPDATE' 
                        })}
                    ],
                });
                
                const emailCommandPayload = {
                    to: userEmail,
                    subject: "gmail xác nhận đơn",
                    content: `Tên sản phẩm: ${productInfo.name}, Tổng tiền: ${totalPrice}`
                };
                
                // 2. Bắn thẳng vào topic "hehe"
                await producer.send({
                    topic: 'send-email-topic-v2',
                    messages: [
                        { value: JSON.stringify(emailCommandPayload) }
                    ],
                });
                
                return res.json({ isAvailable: true, message: "Đã giữ chỗ thành công (Redis)" });
            } else {
                return res.json({ isAvailable: false, message: "Hết hàng rồi (Redis)" });
            }
        }
        
        // --- NẾU REDIS TRỐNG (LẦN ĐẦU TIÊN), VÀO DB LẤY ---
        const product = await Product.findOne({ where: { product_id: productId } });
        if (!product) {
            return res.status(404).json({ error: "Không tìm thấy sản phẩm" });
        }
        
        if (product.stock >= qty) {
            const remainingStock = product.stock - qty;
            const totalPrice = product.price * qty;

            // LƯU CẢ 2 THỨ LÊN REDIS CHO NHỮNG LẦN SAU
            await redisClient.setEx(stockKey, 3600, remainingStock.toString());
            // Cất riêng Tên và Giá thành 1 chuỗi JSON vào Redis
            await redisClient.setEx(infoKey, 3600, JSON.stringify({ 
                name: product.name, 
                price: product.price 
            }));
            
            // Bắn Kafka với thông tin chuẩn từ DB
            await producer.send({
                topic: 'order',
                messages: [
                    { value: JSON.stringify({
                        userId, 
                        productId, 
                        name: product.name, 
                        quantity: qty, 
                        totalPrice, 
                        status: 'PENDING_UPDATE'
                    })}
                ],
            });
            const emailCommandPayload = {
                to: userEmail,
                subject: "gmail xác nhận đơn",
                content: `Tên sản phẩm: ${product.name}, Tổng tiền: ${totalPrice}`
            };
            
            // 2. Bắn thẳng vào topic "hehe"
            await producer.send({
                topic: 'send-email-topic-v2',
                messages: [
                    { value: JSON.stringify(emailCommandPayload) }
                ],
            });
            
            return res.json({ isAvailable: true, message: "Đã giữ chỗ thành công (DB)" });
        } else {
            return res.json({ isAvailable: false, message: "Kho không đủ hàng (DB)" });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};