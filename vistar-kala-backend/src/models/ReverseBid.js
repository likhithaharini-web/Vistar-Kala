const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReverseBid = sequelize.define('ReverseBid', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  requirementId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  artisanId: {
    type: DataTypes.UUID,
    allowNull: false,
  },
  bidPrice: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
  quantityFulfillable: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  completionTimeDays: DataTypes.INTEGER,
  customizationCapability: DataTypes.TEXT,
  proposal: DataTypes.TEXT,
  sampleUrl: DataTypes.STRING,
  matchScore: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('SUBMITTED', 'SELECTED', 'REJECTED'),
    defaultValue: 'SUBMITTED',
  },
}, {
  tableName: 'reverse_bids',
  timestamps: true,
});

module.exports = ReverseBid;
