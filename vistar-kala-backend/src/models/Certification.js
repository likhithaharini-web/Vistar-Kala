const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Certification = sequelize.define('Certification', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  productId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  artisanId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  type: DataTypes.STRING, // e.g. GI, Handloom Mark, State Craft Board
  issuer: DataTypes.STRING,
  documentUrl: DataTypes.STRING,
  craftTechnique: DataTypes.STRING,
  verificationSource: DataTypes.STRING,
  verificationDate: DataTypes.DATE,
  verificationStatus: {
    type: DataTypes.ENUM('VERIFIED', 'PENDING', 'NOT_VERIFIED', 'NOT_APPLICABLE'),
    defaultValue: 'PENDING',
  },
}, {
  tableName: 'certifications',
  timestamps: true,
});

module.exports = Certification;
