// models/user.js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class User extends Model {}

User.init(
  {
    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: {
        args: true,
        msg: 'Email address already in use.',
      },
      validate: {
        isEmail: {
          args: true,
          msg: 'Email address must be valid.',
        },
      },
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
  },
  {
    sequelize,
    modelName: 'User',
    timestamps: true,
    underscored: true,
    tableName: 'users',
  }
);

module.exports = User;

