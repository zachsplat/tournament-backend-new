// tests/controllers/ticketController.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Profile, Tournament, Ticket } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Mock Stripe and QRCode
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ status: 'succeeded' }),
    },
  }));
});

jest.mock('qrcode', () => ({
  toDataURL: jest.fn().mockResolvedValue('data:image/png;base64,valid_qr_image'),
}));

const stripe = require('stripe');
const QRCode = require('qrcode');

let userToken;
let userId;
let profileId;
let tournamentId;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests

  // Create a regular user
  const hashedPasswordUser = await bcrypt.hash('UserPass123!', 12);
  const user = await User.create({
    email: 'ticketuser@example.com',
    password_hash: hashedPasswordUser,
    role: 'user',
  });
  userId = user.user_id;

  // Generate user JWT token
  userToken = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create a profile for the user
  const profile = await Profile.create({
    user_id: user.user_id,
    name: 'Ticket User',
    avatar: 'http://example.com/avatar.jpg',
    bio: 'Testing ticket purchases.',
  });
  profileId = profile.profile_id;

  // Create a tournament
  const tournament = await Tournament.create({
    name: 'Test Tournament',
    description: 'A tournament for testing.',
    date: '2024-11-20',
    location: 'Test City',
    max_tickets: 2,
    price: 1000,
  });
  tournamentId = tournament.tournament_id;
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Ticket Controller', () => {
  describe('POST /api/profiles/:profileId/tickets', () => {
    it('should purchase a ticket successfully', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          tournament_id: tournamentId,
          payment_token: 'tok_visa', // Using Stripe test token
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('ticket_id');
      expect(res.body).toHaveProperty('qr_code', 'data:image/png;base64,valid_qr_image');
      expect(res.body).toHaveProperty('message', 'Ticket purchased successfully.');

      // Verify ticket exists in the database
      const ticket = await Ticket.findByPk(res.body.ticket_id);
      expect(ticket).not.toBeNull();
      expect(ticket.status).toBe('purchased');
      expect(ticket.tournament_id).toBe(tournamentId);
      expect(ticket.profile_id).toBe(profileId);
      expect(ticket.qr_code).not.toBe('');
    });

    it('should not purchase a ticket if tickets are sold out', async () => {
      // Purchase second ticket
      await request(app)
        .post(`/api/profiles/${profileId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          tournament_id: tournamentId,
          payment_token: 'tok_visa',
        });

      // Attempt to purchase third ticket, which should be sold out
      const res = await request(app)
        .post(`/api/profiles/${profileId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          tournament_id: tournamentId,
          payment_token: 'tok_visa',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('error', 'Tickets are sold out.');
    });

    it('should return validation errors for missing fields', async () => {
      const res = await request(app)
        .post(`/api/profiles/${profileId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          tournament_id: '',
          payment_token: '',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Tournament ID must be an integer.' }),
          expect.objectContaining({ msg: 'Payment token is required.' }),
        ])
      );
    });

    it('should not allow unauthorized profile access', async () => {
      // Create another user and profile
      const hashedPasswordAnother = await bcrypt.hash('AnotherPass123!', 12);
      const anotherUser = await User.create({
        email: 'anotheruser@example.com',
        password_hash: hashedPasswordAnother,
        role: 'user',
      });
      const anotherToken = jwt.sign(
        { user_id: anotherUser.user_id, role: anotherUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .post(`/api/profiles/${profileId}/tickets`)
        .set('Authorization', `Bearer ${anotherToken}`)
        .send({
          tournament_id: tournamentId,
          payment_token: 'tok_visa',
        });
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('error', 'Unauthorized.');
    });
  });

  describe('GET /api/profiles/:profileId/tickets', () => {
    it('should retrieve all tickets for the authenticated profile', async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileId}/tickets`)
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2); // Two tickets purchased earlier
      expect(res.body[0]).toHaveProperty('status');
      expect(res.body[1]).toHaveProperty('status');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get(`/api/profiles/${profileId}/tickets`);
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Access token is missing or invalid.');
    });

    it('should not allow unauthorized profile access', async () => {
      // Create another user and profile
      const hashedPasswordAnother = await bcrypt.hash('AnotherPass123!', 12);
      const anotherUser = await User.create({
        email: 'anotheruser2@example.com',
        password_hash: hashedPasswordAnother,
        role: 'user',
      });
      const anotherToken = jwt.sign(
        { user_id: anotherUser.user_id, role: anotherUser.role },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      const res = await request(app)
        .get(`/api/profiles/${profileId}/tickets`)
        .set('Authorization', `Bearer ${anotherToken}`);
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('error', 'Unauthorized.');
    });
  });
});
