// tests/routes/bracketRoutes.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Profile, Tournament, Ticket, Bracket } = require('../../models');
const crypto = require('crypto');

let adminToken;
let tournamentId;
let bracketId;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests

  // Create an admin user
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'adminbracketroute@example.com',
      password: 'AdminBracketRoute123!',
    });

  const { User: UserModel } = require('../../models');
  await UserModel.update({ role: 'admin' }, { where: { email: 'adminbracketroute@example.com' } });

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'adminbracketroute@example.com',
      password: 'AdminBracketRoute123!',
    });

  adminToken = adminRes.body.token;

  // Create a tournament
  const tournamentRes = await request(app)
    .post('/api/tournaments/admin/tournaments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Route Bracket Tournament',
      description: 'Tournament for route bracket testing.',
      date: '2024-09-25',
      location: 'Bracket Route City',
      max_tickets: 4,
      price: 4000,
    });

  tournamentId = tournamentRes.body.tournament_id;

  // Register and check-in two players
  for (let i = 1; i <= 2; i++) {
    await request(app)
      .post('/api/auth/register')
      .send({
        email: `player${i}bracket@example.com`,
        password: `Player${i}Bracket123!`,
      });

    const userRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: `player${i}bracket@example.com`,
        password: `Player${i}Bracket123!`,
      });

    const userToken = userRes.body.token;

    const profileRes = await request(app)
      .post('/api/profiles')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: `Bracket Player ${i}`,
        avatar: `http://example.com/player${i}bracket.png`,
        bio: `Bio for Bracket Player ${i}.`,
      });

    const profileId = profileRes.body.profile_id;

    // Purchase and check-in ticket
    const ticketRes = await request(app)
      .post(`/api/profiles/${profileId}/tickets`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        tournament_id: tournamentId,
        payment_token: 'tok_visa',
      });

    const ticketId = ticketRes.body.ticket_id;
    const qrData = Buffer.from(JSON.stringify({
      ticket_id: ticketId,
      profile_id: profileId,
      tournament_id: tournamentId,
      signature: crypto.createHmac('sha256', process.env.QR_SECRET)
        .update(`${ticketId}${profileId}${tournamentId}`)
        .digest('hex'),
    })).toString('base64');

    // Check-in the ticket
    await request(app)
      .post('/api/admin/scan-qr')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        qr_data: qrData,
      });
  }
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Bracket Routes', () => {
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

      bracketId = bracket.bracket_id;
    });

    it('should not allow non-admin user to generate a bracket', async () => {
      // Register and login a regular user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'userbracketroute@example.com',
          password: 'UserBracketRoute123!',
        });

      const userRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'userbracketroute@example.com',
          password: 'UserBracketRoute123!',
        });

      const userToken = userRes.body.token;

      const res = await request(app)
        .post(`/api/brackets/admin/tournaments/${tournamentId}/bracket`)
        .set('Authorization', `Bearer ${userToken}`)
        .send();

      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('error', 'Admin access required.');
    });

    it('should return 404 when generating bracket for non-existent tournament', async () => {
      const res = await request(app)
        .post('/api/brackets/admin/tournaments/9999/bracket')
        .set('Authorization', `Bearer ${adminToken}`)
        .send();

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Tournament not found.');
    });
  });

  describe('GET /api/brackets/:id', () => {
    it('should retrieve an existing bracket', async () => {
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
