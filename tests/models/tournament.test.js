// tests/models/tournament.test.js
const { Tournament } = require('../../models');

describe('Tournament Model', () => {
  beforeAll(async () => {
    await Tournament.sync({ force: true }); // Reset Tournament table before tests
  });

  it('should create a tournament with valid data', async () => {
    const tournament = await Tournament.create({
      name: 'Valid Tournament',
      description: 'A valid tournament description.',
      date: '2024-05-20',
      location: 'Valid City',
      max_tickets: 100,
      price: 5000,
    });

    expect(tournament).toHaveProperty('tournament_id');
    expect(tournament.name).toBe('Valid Tournament');
    expect(tournament.description).toBe('A valid tournament description.');
    expect(tournament.date).toEqual(expect.any(Date));
    expect(tournament.location).toBe('Valid City');
    expect(tournament.max_tickets).toBe(100);
    expect(tournament.price).toBe(5000);
  });

  it('should not create a tournament with invalid date', async () => {
    await expect(Tournament.create({
      name: 'Invalid Date Tournament',
      description: 'Description.',
      date: 'invalid-date',
      location: 'City',
      max_tickets: 50,
      price: 3000,
    })).rejects.toThrow();
  });

  it('should not create a tournament with negative max_tickets', async () => {
    await expect(Tournament.create({
      name: 'Negative Tickets Tournament',
      description: 'Description.',
      date: '2024-06-15',
      location: 'City',
      max_tickets: -10,
      price: 3000,
    })).rejects.toThrow();
  });

  it('should default price to 50 if not specified', async () => {
    const tournament = await Tournament.create({
      name: 'Default Price Tournament',
      description: 'Description.',
      date: '2024-07-10',
      location: 'City',
      max_tickets: 80,
    });

    expect(tournament.price).toBe(50);
  });
});
