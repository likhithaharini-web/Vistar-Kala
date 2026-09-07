const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Requirement = sequelize.define('Requirement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  buyerId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  productRequired: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  category: DataTypes.STRING,
  quantity: {
    type: DataTypes.INTEGER,
    defaultValue: 1,
  },
  customization: DataTypes.TEXT,
  budget: DataTypes.FLOAT,
  requiredByDate: DataTypes.DATE,
  deliveryLocation: DataTypes.STRING,
  additionalRequirements: DataTypes.TEXT,
  referenceImageUrl: DataTypes.STRING,
  status: {
    type: DataTypes.ENUM('OPEN', 'CLOSED', 'FULFILLED'),
    defaultValue: 'OPEN',
  },
  selectedArtisanId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
}, {
  tableName: 'requirements',
  timestamps: true,
});

module.exports = Requirement;
