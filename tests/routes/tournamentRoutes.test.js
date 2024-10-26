// tests/routes/tournamentRoutes.test.js
const request = require('supertest');
const app = require('../../app');
const { sequelize, User, Tournament } = require('../../models');

let adminToken;
let userToken;

beforeAll(async () => {
  await sequelize.sync({ force: true }); // Reset database before tests

  // Register and login an admin user
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'adminroute@example.com',
      password: 'AdminRoute123!',
    });

  const { User: UserModel } = require('../../models');
  await UserModel.update({ role: 'admin' }, { where: { email: 'adminroute@example.com' } });

  const adminRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'adminroute@example.com',
      password: 'AdminRoute123!',
    });

  adminToken = adminRes.body.token;

  // Register and login a regular user
  await request(app)
    .post('/api/auth/register')
    .send({
      email: 'userroute@example.com',
      password: 'UserRoute123!',
    });

  const userRes = await request(app)
    .post('/api/auth/login')
    .send({
      email: 'userroute@example.com',
      password: 'UserRoute123!',
    });

  userToken = userRes.body.token;
});

afterAll(async () => {
  await sequelize.close(); // Close connection after tests
});

describe('Tournament Routes', () => {
  describe('GET /api/tournaments', () => {
    it('should list all tournaments', async () => {
      // Create sample tournaments
      await Tournament.bulkCreate([
        {
          name: 'Route Tournament 1',
          description: 'First tournament for route testing.',
          date: '2024-09-10',
          location: 'Route City 1',
          max_tickets: 50,
          price: 3000,
        },
        {
          name: 'Route Tournament 2',
          description: 'Second tournament for route testing.',
          date: '2024-10-20',
          location: 'Route City 2',
          max_tickets: 75,
          price: 4500,
        },
      ]);

      const res = await request(app)
        .get('/api/tournaments');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0]).toHaveProperty('name', 'Route Tournament 1');
      expect(res.body[1]).toHaveProperty('name', 'Route Tournament 2');
    });
  });

  describe('GET /api/tournaments/:id', () => {
    it('should retrieve tournament details', async () => {
      const res = await request(app)
        .get('/api/tournaments/1');

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('name', 'Route Tournament 1');
      expect(res.body).toHaveProperty('description', 'First tournament for route testing.');
    });

    it('should return 404 for non-existent tournament', async () => {
      const res = await request(app)
        .get('/api/tournaments/999');

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('error', 'Tournament not found.');
    });
  });

  describe('POST /api/tournaments/admin/tournaments', () => {
    it('should allow admin to create a tournament', async () => {
      const res = await request(app)
        .post('/api/tournaments/admin/tournaments')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Route Tournament',
          description: 'A new tournament created via route testing.',
          date: '2024-11-15',
          location: 'Route City 3',
          max_tickets: 100,
          price: 5000,
        });
      expect(res.statusCode).toEqual(201);
      expect(res.body).toHaveProperty('tournament_id');
      expect(res.body).toHaveProperty('message', 'Tournament created successfully.');

      // Verify tournament exists in the database
      const tournament = await Tournament.findByPk(res.body.tournament_id);
      expect(tournament).not.toBeNull();
      expect(tournament.name).toBe('New Route Tournament');
    });

    it('should not allow non-admin user to create a tournament', async () => {
      const res = await request(app)
        .post('/api/tournaments/admin/tournaments')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Unauthorized Tournament',
          description: 'Attempt to create tournament without admin rights.',
          date: '2024-12-05',
          location: 'Unauthorized City',
          max_tickets: 60,
          price: 3500,
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
          max_tickets: -20,
          price: -1000,
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
  });
});
