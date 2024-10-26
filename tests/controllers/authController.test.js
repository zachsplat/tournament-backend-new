// tests/controllers/authController.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User } = require('../../models');

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Auth Controller', () => {
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('message', 'User registered successfully.');
      
      // Verify user exists in the database
      const user = await User.findOne({ where: { email: 'testuser@example.com' } });
      expect(user).not.toBeNull();
      expect(user.role).toBe('user');
    });

    it('should not register user if email already exists', async () => {
      // Attempt to register with the same email
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'testuser@example.com',
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
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Please provide a valid email address.' }),
          expect.objectContaining({ msg: 'Password must be at least 6 characters long.' }),
        ])
      );
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!',
        });
      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toMatchObject({
        email: 'testuser@example.com',
        role: 'user',
      });
    });

    it('should not login user with incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'WrongPassword!',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Invalid credentials.');
    });

    it('should not login non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
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
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Please provide a valid email address.' }),
          expect.objectContaining({ msg: 'Password is required.' }),
        ])
      );
    });
  });
});
