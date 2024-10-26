// tests/controllers/tournamentController.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Tournament } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let adminToken;
let userToken;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests

  // Create an admin user
  const hashedPasswordAdmin = await bcrypt.hash('AdminPass123!', 12);
  const adminUser = await User.create({
    email: 'admin@example.com',
    password_hash: hashedPasswordAdmin,
    role: 'admin',
  });

  // Generate admin JWT token
  adminToken = jwt.sign(
    { user_id: adminUser.user_id, role: adminUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  // Create a regular user
  const hashedPasswordUser = await bcrypt.hash('UserPass123!', 12);
  const regularUser = await User.create({
    email: 'user@example.com',
    password_hash: hashedPasswordUser,
    role: 'user',
  });

  // Generate user JWT token
  userToken = jwt.sign(
    { user_id: regularUser.user_id, role: regularUser.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Tournament Controller', () => {
  describe('GET /api/tournaments', () => {
    it('should list all tournaments', async () => {
      // Create sample tournaments
      await Tournament.create({
        name: 'Winter Clash',
        description: 'Winter-themed gaming tournament.',
        date: '2024-12-15',
        location: 'New York',
        max_tickets: 50,
        price: 1000,
      });

      await Tournament.create({
        name: 'Spring Showdown',
        description: 'Spring season tournament.',
        date: '2024-04-20',
        location: 'Chicago',
        max_tickets: 75,
        price: 1500,
      });

      const res = await request(app)
        .get('/api/tournaments');
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('name', 'Winter Clash');
      expect(res.body[1]).toHaveProperty('name', 'Spring Showdown');
    });
  });

  describe('GET /api/tournaments/:id', () => {
    it('should retrieve tournament details by ID', async () => {
      // Create a tournament
      const tournament = await Tournament.create({
        name: 'Autumn Arena',
        description: 'Autumn season tournament.',
        date: '2024-10-10',
        location: 'Seattle',
        max_tickets: 60,
        price: 1200,
      });

      const res = await request(app)
        .get(`/api/tournaments/${tournament.tournament_id}`);
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('name', 'Autumn Arena');
      expect(res.body).toHaveProperty('location', 'Seattle');
    });

    it('should return 404 for non-existent tournament', async () => {
      const res = await request(app)
        .get('/api/tournaments/999');
      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Tournament not found.');
    });
  });

  describe('POST /api/tournaments/admin/tournaments', () => {
    it('should create a new tournament successfully by admin', async () => {
      const res = await request(app)
        .post('/api/tournaments/admin/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Summer Slam',
          description: 'Summer gaming extravaganza.',
          date: '2024-07-25',
          location: 'Los Angeles',
          max_tickets: 100,
          price: 2000,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('tournament_id');
      expect(res.body).toHaveProperty('message', 'Tournament created successfully.');

      // Verify tournament exists in the database
      const tournament = await Tournament.findByPk(res.body.tournament_id);
      expect(tournament).not.toBeNull();
      expect(tournament.name).toBe('Summer Slam');
      expect(tournament.location).toBe('Los Angeles');
    });

    it('should not allow non-admin users to create tournaments', async () => {
      const res = await request(app)
        .post('/api/tournaments/admin/tournaments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Tournament',
          description: 'Should not be created.',
          date: '2024-08-01',
          location: 'Miami',
          max_tickets: 80,
          price: 1800,
        });
      expect(res.statusCode).toEqual(403);
      expect(res.body).toHaveProperty('error', 'Admin access required.');
    });

    it('should return validation errors for invalid input', async () => {
      const res = await request(app)
        .post('/api/tournaments/admin/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '',
          description: '',
          date: 'invalid-date',
          location: '',
          max_tickets: -10,
          price: -500,
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Tournament name is required.' }),
          expect.objectContaining({ msg: 'Description is required.' }),
          expect.objectContaining({ msg: 'Date must be a valid ISO 8601 date.' }),
          expect.objectContaining({ msg: 'Location is required.' }),
          expect.objectContaining({ msg: 'Max tickets must be at least 1.' }),
          expect.objectContaining({ msg: 'Price must be a non-negative integer.' }),
        ])
      );
    });

    it('should require admin authentication', async () => {
      const res = await request(app)
        .post('/api/tournaments/admin/tournaments')
        .send({
          name: 'No Auth Tournament',
          description: 'Should not be created.',
          date: '2024-09-10',
          location: 'Houston',
          max_tickets: 70,
          price: 1600,
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Access token is missing or invalid.');
    });
  });
});
