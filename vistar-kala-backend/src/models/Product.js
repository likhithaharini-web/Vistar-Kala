const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Product = sequelize.define('Product', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  artisanId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: DataTypes.STRING,
  material: DataTypes.STRING,
  craftType: DataTypes.STRING,
  origin: DataTypes.STRING,
  description: DataTypes.TEXT,
  englishDescription: DataTypes.TEXT,
  hindiDescription: DataTypes.TEXT,
  keywords: DataTypes.TEXT, // comma-separated
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  dimensions: DataTypes.STRING,
  productionTimeDays: DataTypes.INTEGER,
  customizationAvailable: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isHandmade: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  isGI: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  price: DataTypes.FLOAT,
  status: {
    type: DataTypes.ENUM('DRAFT', 'PUBLISHED', 'UNPUBLISHED'),
    defaultValue: 'DRAFT',
  },
  authenticationStatus: {
    type: DataTypes.ENUM('VERIFIED', 'PENDING', 'NOT_VERIFIED', 'NOT_APPLICABLE'),
    defaultValue: 'NOT_VERIFIED',
  },
  isReported: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
}, {
  tableName: 'products',
  timestamps: true,
});

module.exports = Product;
