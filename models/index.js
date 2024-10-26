// models/index.js
const sequelize = require('../config/database');
const User = require('./user');
const Profile = require('./profile');
const Tournament = require('./tournament');
const Ticket = require('./ticket');
const Bracket = require('./bracket');

// Associations
User.hasMany(Profile, { foreignKey: 'user_id' });
Profile.belongsTo(User, { foreignKey: 'user_id' });

Profile.hasMany(Ticket, { foreignKey: 'profile_id' });
Ticket.belongsTo(Profile, { foreignKey: 'profile_id' });

Tournament.hasMany(Ticket, { foreignKey: 'tournament_id' });
Ticket.belongsTo(Tournament, { foreignKey: 'tournament_id' });

Tournament.hasOne(Bracket, { foreignKey: 'tournament_id' });
Bracket.belongsTo(Tournament, { foreignKey: 'tournament_id' });

module.exports = {
  sequelize,
  User,
  Profile,
  Tournament,
  Ticket,
  Bracket,
};

