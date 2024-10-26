// models/bracket.js
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Tournament = require('./tournament');

class Bracket extends Model {}

Bracket.init(
  {
    bracket_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    tournament_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Tournament,
        key: 'tournament_id',
      },
      onDelete: 'CASCADE',
    },
    bracket_data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'Bracket',
    timestamps: true,
    underscored: true,
    tableName: 'brackets',
  }
);

// Associations
Bracket.belongsTo(Tournament, { foreignKey: 'tournament_id' });
Tournament.hasOne(Bracket, { foreignKey: 'tournament_id' });

module.exports = Bracket;

