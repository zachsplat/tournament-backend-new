// tests/controllers/bracketController.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Profile, Tournament, Ticket, Bracket } = require('../../models');

let adminToken;
let tournamentId;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests

  // Create an admin user
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'adminbracket@example.com',
      password: 'AdminBracket123!',
    });

  const { User: UserModel } = require('../../models');
  await UserModel.update({ role: 'admin' }, { where: { email: 'adminbracket@example.com' } });

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'adminbracket@example.com',
      password: 'AdminBracket123!',
    });

  adminToken = adminRes.body.token;

  // Create a tournament
  const tournamentRes = await request(app)
    .post('/api/tournaments/admin/tournaments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Bracket Tournament',
      description: 'Tournament to test bracket generation.',
      date: '2024-09-10',
      location: 'Bracket City',
      max_tickets: 4,
      price: 2500,
    });

  tournamentId = tournamentRes.body.tournament_id;

  // Create and check-in profiles and tickets
  for (let i = 1; i <= 4; i++) {
    // Register a user
    await request(app)
      .post('/api/auth/register')
      .send({
        email: `player${i}@example.com`,
        password: `PlayerPass${i}123!`,
      });

    const userRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: `player${i}@example.com`,
        password: `PlayerPass${i}123!`,
      });

    const userToken = userRes.body.token;

    // Create a profile
    const profileRes = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: `Player ${i}`,
        avatar: `http://example.com/player${i}.png`,
        bio: `Bio for Player ${i}.`,
      });

    const profileId = profileRes.body.profile_id;

    // Purchase a ticket and check it in
    await request(app)
      .post(`/api/profiles/${profileId}/tickets`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        tournament_id: tournamentId,
        payment_token: 'tok_visa',
      });

    // Manually check-in the ticket by updating its status
    const { Ticket: TicketModel } = require('../../models');
    await TicketModel.update({ status: 'checked_in' }, { where: { profile_id: profileId, tournament_id: tournamentId } });
  }
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Bracket Controller', () => {
  describe('POST /api/brackets/admin/tournaments/:id/bracket', () => {
    it('should generate a bracket successfully as admin', async () => {
      const res = await request(app)
        .post(`/api/brackets/admin/tournaments/${tournamentId}/bracket`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('bracket_id');
      expect(res.body).toHaveProperty('message', 'Bracket generated successfully.');
      expect(res.body).toHaveProperty('public_url');

      // Verify bracket exists in the database
      const bracket = await Bracket.findByPk(res.body.bracket_id);
      expect(bracket).not.toBeNull();
      expect(bracket.tournament_id).toBe(tournamentId);
      expect(bracket.bracket_data).toHaveProperty('rounds');
    });

    it('should not generate a bracket if not enough players', async () => {
      // Create a new tournament with max_tickets = 2 and only 1 player checked in
      const newTournamentRes = await request(app)
        .post('/api/tournaments/admin/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Small Tournament',
          description: 'Tournament with limited players.',
          date: '2024-07-15',
          location: 'Small City',
          max_tickets: 2,
          price: 1500,
        });

      const newTournamentId = newTournamentRes.body.tournament_id;

      // Register and check-in only one player
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'solo@example.com',
          password: 'SoloPass123!',
        });

      const soloRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'solo@example.com',
          password: 'SoloPass123!',
        });

      const soloToken = soloRes.body.token;

      const profileRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${soloToken}`)
        .send({
          name: 'Solo Player',
          avatar: 'http://example.com/solo.png',
          bio: 'I am alone.',
        });

      const soloProfileId = profileRes.body.profile_id;

      await request(app)
        .post(`/api/profiles/${soloProfileId}/tickets`)
        .set('Authorization', `Bearer ${soloToken}`)
        .send({
          tournament_id: newTournamentId,
          payment_token: 'tok_visa',
        });

      // Manually check-in the ticket
      const { Ticket: TicketModel } = require('../../models');
      await TicketModel.update({ status: 'checked_in' }, { where: { profile_id: soloProfileId, tournament_id: newTournamentId } });

      // Attempt to generate bracket
      const res = await request(app)
        .post(`/api/brackets/admin/tournaments/${newTournamentId}/bracket`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Not enough players to generate a bracket.');
    });

    it('should not allow non-admin user to generate a bracket', async () => {
      const res = await request(app)
        .post(`/api/brackets/admin/tournaments/${tournamentId}/bracket`)
        .send(); // No token provided

      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Access token is missing or invalid.');
    });
  });

  describe('GET /api/brackets/:id', () => {
    it('should retrieve a bracket successfully', async () => {
      // First, generate a bracket
      const generateRes = await request(app)
        .post(`/api/brackets/admin/tournaments/${tournamentId}/bracket`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      const bracketId = generateRes.body.bracket_id;

      const res = await request(app)
        .get(`/api/brackets/${bracketId}`)
        .send();

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('bracket_id', bracketId);
      expect(res.body).toHaveProperty('tournament_id', tournamentId);
      expect(res.body.bracket_data).toHaveProperty('rounds');
    });

    it('should return 404 for non-existent bracket', async () => {
      const res = await request(app)
        .get('/api/brackets/9999')
        .send();

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Bracket not found.');
    });
  });
});

