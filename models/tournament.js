// models/tournament.js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Tournament extends Model {}

Tournament.init(
  {
    tournament_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      validate: {
        isDate: true,
      },
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    max_tickets: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        isInt: true,
      },
    },
    price: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      validate: {
        min: 0,
        isInt: true,
      },
    },
  },
  {
    sequelize,
    modelName: 'Tournament',
    timestamps: true,
    underscored: true,
    tableName: 'tournaments',
  }
);

module.exports = Tournament;

