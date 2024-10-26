// models/profile.js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

class Profile extends Model {}

Profile.init(
  {
    profile_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: User,
        key: 'user_id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    category: {
      type: DataTypes.ENUM('Youth', 'Teen Male', 'Teen Female', 'Adult Male', 'Adult Female'),
      allowNull: false,
      defaultValue: 'Adult Male',
    },
  },
  {
    sequelize,
    modelName: 'Profile',
    timestamps: true,
    underscored: true,
    tableName: 'profiles',
  }
);

Profile.belongsTo(User, { foreignKey: 'user_id' });
User.hasMany(Profile, { foreignKey: 'user_id' });

module.exports = Profile;

