const { Kafka } = require('kafkajs');
const Product = require('./Product'); // Đường dẫn tới file Model Product của bạn

const kafka = new Kafka({ clientId: 'kho-service', brokers: ['localhost:9092'] });
const consumer = kafka.consumer({ groupId: 'kho-db-updater' });

const startConsumer = async () => {
    try {
        await consumer.connect();
        await consumer.subscribe({ topic: 'order', fromBeginning: false });
        console.log("🎧 Consumer đang nghe topic 'order'...");

        await consumer.run({
            eachMessage: async ({ message }) => {
                const data = JSON.parse(message.value.toString());
                if (data.status === 'PENDING_UPDATE') {
                    const product = await Product.findOne({ where: { product_id: data.productId } });
                    if (product) {
                        product.stock = product.stock - data.quantity;
                        await product.save();
                        console.log(`✅ Đã trừ DB: ${data.quantity} món cho SP ${data.productId}`);
                    }
                }
            },
        });
    } catch (error) {
        console.error("❌ Lỗi Consumer:", error);
    }
};

module.exports = startConsumer;