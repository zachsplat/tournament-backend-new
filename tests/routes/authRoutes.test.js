// tests/routes/authRoutes.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User } = require('../../models');

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Auth Routes', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'routeuser@example.com',
          password: 'RoutePass123!',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully.');
    });

    it('should not register user with existing email', async () => {
      // Register the same user again
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'routeuser@example.com',
          password: 'AnotherPass123!',
        });
      expect(res.statusCode).toEqual(409);
      expect(res.body).toHaveProperty('error', 'Email already exists.');
    });

    it('should return validation errors for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login an existing user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'routeuser@example.com',
          password: 'RoutePass123!',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should not login with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'routeuser@example.com',
          password: 'WrongPass123!',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials.');
    });

    it('should not login non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'SomePass123!',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials.');
    });

    it('should return validation errors for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: '',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
    });
  });
});
