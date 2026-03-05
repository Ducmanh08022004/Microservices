const { DataTypes } = require('sequelize');
const sequelize = require('./db'); // Đảm bảo file db.js cũng nằm ở đây

const Product = sequelize.define('Product', {
    product_id: {
        type: DataTypes.STRING,
        unique: true,
        allowNull: false
    },
    name: DataTypes.STRING,
    stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    price: DataTypes.DOUBLE
});

module.exports = Product;