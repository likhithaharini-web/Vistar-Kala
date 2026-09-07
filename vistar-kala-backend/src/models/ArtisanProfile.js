const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ArtisanProfile = sequelize.define('ArtisanProfile', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    unique: true,
  },
  location: DataTypes.STRING,
  craftCategory: DataTypes.STRING,
  experienceYears: DataTypes.INTEGER,
  certificationsSummary: DataTypes.TEXT,
  verificationStatus: {
    type: DataTypes.ENUM('VERIFIED', 'PENDING', 'NOT_VERIFIED', 'NOT_APPLICABLE'),
    defaultValue: 'PENDING',
  },
  rating: {
    type: DataTypes.FLOAT,
    defaultValue: 0,
  },
}, {
  tableName: 'artisan_profiles',
  timestamps: true,
});

module.exports = ArtisanProfile;
