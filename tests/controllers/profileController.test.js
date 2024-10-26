// tests/controllers/profileController.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Profile } = require('../../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let token;
let userId;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests

  // Create a test user
  const hashedPassword = await bcrypt.hash('Password123!', 12);
  const user = await User.create({
    email: 'profileuser@example.com',
    password_hash: hashedPassword,
    role: 'user',
  });
  userId = user.user_id;

  // Generate JWT token
  token = jwt.sign(
    { user_id: user.user_id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Profile Controller', () => {
  describe('POST /api/profiles', () => {
    it('should create a new profile successfully', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'John Doe',
          avatar: 'http://example.com/avatar.jpg',
          bio: 'Avid gamer and streamer.',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('profile_id');
      expect(res.body).toHaveProperty('message', 'Profile created successfully.');

      // Verify profile exists in the database
      const profile = await Profile.findByPk(res.body.profile_id);
      expect(profile).not.toBeNull();
      expect(profile.name).toBe('John Doe');
      expect(profile.avatar).toBe('http://example.com/avatar.jpg');
      expect(profile.bio).toBe('Avid gamer and streamer.');
    });

    it('should create a profile without optional fields', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Jane Smith',
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('profile_id');
      expect(res.body).toHaveProperty('message', 'Profile created successfully.');

      // Verify profile exists in the database
      const profile = await Profile.findByPk(res.body.profile_id);
      expect(profile).not.toBeNull();
      expect(profile.name).toBe('Jane Smith');
      expect(profile.avatar).toBeNull();
      expect(profile.bio).toBeNull();
    });

    it('should return validation errors for missing name', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          avatar: 'http://example.com/avatar.jpg',
          bio: 'Another bio.',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Name is required.' }),
        ])
      );
    });

    it('should return validation errors for invalid avatar URL', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Avatar',
          avatar: 'not-a-valid-url',
        });
      expect(res.statusCode).toEqual(400);
      expect(res.body).toHaveProperty('errors');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ msg: 'Avatar must be a valid URL.' }),
        ])
      );
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .post('/api/profiles')
        .send({
          name: 'No Auth User',
        });
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Access token is missing or invalid.');
    });
  });

  describe('GET /api/profiles', () => {
    it('should retrieve all profiles for the authenticated user', async () => {
      // Create another profile for the same user
      await Profile.create({
        user_id: userId,
        name: 'Second Profile',
        avatar: 'http://example.com/avatar2.jpg',
        bio: 'Second bio.',
      });

      const res = await request(app)
        .get('/api/profiles')
        .set('Authorization', `Bearer ${token}`);
      expect(res.statusCode).toEqual(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body[0]).toHaveProperty('name');
      expect(res.body[1]).toHaveProperty('name');
    });

    it('should require authentication', async () => {
      const res = await request(app)
        .get('/api/profiles');
      expect(res.statusCode).toEqual(401);
      expect(res.body).toHaveProperty('error', 'Access token is missing or invalid.');
    });
  });
});
