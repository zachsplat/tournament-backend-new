// tests/routes/profileRoutes.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Profile } = require('../../models');

let token;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests
  
  // Register and login a user to obtain token
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'routeprofile@example.com',
      password: 'RouteProfile123!',
    });

  const res = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'routeprofile@example.com',
      password: 'RouteProfile123!',
    });

  token = res.body.token;
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Profile Routes', () => {
  describe('POST /api/profiles', () => {
    it('should create a new profile', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Route Profile',
          avatar: 'http://example.com/avatar.png',
          bio: 'Bio for route profile.',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('profile_id');
      expect(res.body).toHaveProperty('message', 'Profile created successfully.');
    });

    it('should not create a profile without authentication', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .send({
          name: 'Unauthenticated Profile',
          avatar: 'http://example.com/avatar.png',
          bio: 'Bio for unauthenticated profile.',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Access token is missing or invalid.');
    });

    it('should not create a profile with invalid data', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '', // Empty name
          avatar: 'invalid-url',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Name is required.' }),
          expect.objectContaining({ msg: 'Avatar must be a valid URL.' }),
        ])
      );
    });
  });

  describe('GET /api/profiles', () => {
    it('should retrieve all profiles for the authenticated user', async () => {
      // Create another profile
      await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Second Route Profile',
          bio: 'Second bio.',
        });

      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('name', 'Route Profile');
      expect(res.body[1]).toHaveProperty('name', 'Second Route Profile');
    });

    it('should not retrieve profiles without authentication', async () => {
      const res = await request(app)
        .get('/api/profiles');
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Access token is missing or invalid.');
    });
  });
});

