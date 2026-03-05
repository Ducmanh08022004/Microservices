const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'kho-service',
    brokers: ['localhost:9092']
});

const producer = kafka.producer();

module.exports = producer;