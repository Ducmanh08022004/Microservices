const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'kho-service',
    brokers: [process.env.KAFKA_HOST]
});

const producer = kafka.producer();

module.exports = producer;