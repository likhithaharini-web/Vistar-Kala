const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PriceAnalysis = sequelize.define('PriceAnalysis', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  inputFactors: {
    type: DataTypes.TEXT, // JSON string of the factors submitted
  },
  estimatedProductionCost: DataTypes.FLOAT,
  recommendedPrice: DataTypes.FLOAT,
  priceRangeLow: DataTypes.FLOAT,
  priceRangeHigh: DataTypes.FLOAT,
  estimatedProfit: DataTypes.FLOAT,
  marketComparison: DataTypes.TEXT,
  explanation: DataTypes.TEXT,
}, {
  tableName: 'price_analyses',
  timestamps: true,
});

module.exports = PriceAnalysis;
