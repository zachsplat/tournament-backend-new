// tests/controllers/checkinController.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Profile, Tournament, Ticket, Bracket } = require('../../models');
const crypto = require('crypto');

let adminToken;
let tournamentId;
let ticketId;
let qrData;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests

  // Create an admin user
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'admincheckin@example.com',
      password: 'AdminCheckin123!',
    });

  const { User: UserModel } = require('../../models');
  await UserModel.update({ role: 'admin' }, { where: { email: 'admincheckin@example.com' } });

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'admincheckin@example.com',
      password: 'AdminCheckin123!',
    });

  adminToken = adminRes.body.token;

  // Create a tournament
  const tournamentRes = await request(app)
    .post('/api/tournaments/admin/tournaments')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      name: 'Check-In Tournament',
      description: 'Tournament to test check-in functionality.',
      date: '2024-08-25',
      location: 'Check-In City',
      max_tickets: 2,
      price: 3000,
    });

  tournamentId = tournamentRes.body.tournament_id;

  // Register a user
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'playercheckin@example.com',
      password: 'PlayerCheckin123!',
    });

  const userRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'playercheckin@example.com',
      password: 'PlayerCheckin123!',
    });

  const userToken = userRes.body.token;

  // Create a profile
  const profileRes = await request(app)
    .post('/api/profiles')
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      name: 'Check-In Player',
      avatar: 'http://example.com/playercheckin.png',
      bio: 'Ready to check in.',
    });

  const profileId = profileRes.body.profile_id;

  // Purchase a ticket
  const ticketRes = await request(app)
    .post(`/api/profiles/${profileId}/tickets`)
    .set('Authorization', `Bearer ${userToken}`)
    .send({
      tournament_id: tournamentId,
      payment_token: 'tok_visa',
    });

  ticketId = ticketRes.body.ticket_id;
  qrData = Buffer.from(JSON.stringify({
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
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Check-In Controller', () => {
  describe('POST /api/admin/scan-qr', () => {
    it('should successfully check-in a ticket with valid QR data', async () => {
      // Create another ticket for testing
      // Register another user
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'player2checkin@example.com',
          password: 'Player2Checkin123!',
        });

      const userRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'player2checkin@example.com',
          password: 'Player2Checkin123!',
        });

      const userToken = userRes.body.token;

      // Create a profile
      const profileRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Second Check-In Player',
          avatar: 'http://example.com/player2checkin.png',
          bio: 'Another ready player.',
        });

      const profileId = profileRes.body.profile_id;

      // Purchase a ticket
      const ticketRes = await request(app)
        .post(`/api/profiles/${profileId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          tournament_id: tournamentId,
          payment_token: 'tok_visa',
        });

      const newTicketId = ticketRes.body.ticket_id;
      const newQrData = Buffer.from(JSON.stringify({
        ticket_id: newTicketId,
        profile_id: profileId,
        tournament_id: tournamentId,
        signature: crypto.createHmac('sha256', process.env.QR_SECRET)
          .update(`${newTicketId}${profileId}${tournamentId}`)
          .digest('hex'),
      })).toString('base64');

      // Check-in the new ticket
      const res = await request(app)
        .post('/api/admin/scan-qr')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qr_data: newQrData,
        });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('message', 'Check-in successful.');
      expect(res.body).toHaveProperty('ticket_id', newTicketId);
      expect(res.body).toHaveProperty('profile_id', profileId);

      // Verify ticket status in the database
      const { Ticket: TicketModel } = require('../../models');
      const ticket = await TicketModel.findByPk(newTicketId);
      expect(ticket.status).toBe('checked_in');
    });

    it('should not check-in a ticket with invalid QR data', async () => {
      const res = await request(app)
        .post('/api/admin/scan-qr')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qr_data: 'invalid_base64_data',
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Invalid QR code format.');
    });

    it('should not check-in a ticket with tampered QR signature', async () => {
      // Tamper with the QR data
      const tamperedQrData = Buffer.from(JSON.stringify({
        ticket_id: ticketId,
        profile_id: 999, // Incorrect profile_id
        tournament_id: tournamentId,
        signature: crypto.createHmac('sha256', process.env.QR_SECRET)
          .update(`${ticketId}999${tournamentId}`)
          .digest('hex'),
      })).toString('base64');

      const res = await request(app)
        .post('/api/admin/scan-qr')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qr_data: tamperedQrData,
        });

      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Ticket not found.');
    });

    it('should not check-in an already checked-in ticket', async () => {
      // Attempt to check-in the same ticket again
      const res = await request(app)
        .post('/api/admin/scan-qr')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          qr_data: qrData,
        });

      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('error', 'Ticket already checked in.');
    });
  });
});
