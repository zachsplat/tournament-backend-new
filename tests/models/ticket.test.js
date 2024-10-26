// tests/models/ticket.test.js
const { Ticket, Profile, Tournament } = require('../../models');
const { sequelize, User } = require('../../models');

describe('Ticket Model', () => {
  let profile;
  let tournament;

  beforeAll(async () => {
    await sequelize.sync({ force: true }); // Reset database before tests

    // Create a user
    const user = await User.create({
      email: 'ticketmodel@example.com',
      password_hash: 'hashedpassword',
    });

    // Create a profile
    profile = await Profile.create({
      user_id: user.user_id,
      name: 'Ticket Model Profile',
      avatar: 'http://example.com/avatar.png',
      bio: 'Bio for ticket model testing.',
    });

    // Create a tournament
    tournament = await Tournament.create({
      name: 'Model Tournament',
      description: 'Tournament for testing Ticket model.',
      date: '2024-07-20',
      location: 'Model City',
      max_tickets: 5,
      price: 4000,
    });
  });

  it('should create a ticket with valid data', async () => {
    const ticket = await Ticket.create({
      profile_id: profile.profile_id,
      tournament_id: tournament.tournament_id,
      qr_code: 'valid_qr_code_data',
      status: 'purchased',
      purchase_date: new Date(),
    });

    expect(ticket).toHaveProperty('ticket_id');
    expect(ticket.profile_id).toBe(profile.profile_id);
    expect(ticket.tournament_id).toBe(tournament.tournament_id);
    expect(ticket.qr_code).toBe('valid_qr_code_data');
    expect(ticket.status).toBe('purchased');
    expect(ticket.purchase_date).toEqual(expect.any(Date));
  });

  it('should not create a ticket with invalid status', async () => {
    await expect(Ticket.create({
      profile_id: profile.profile_id,
      tournament_id: tournament.tournament_id,
      qr_code: 'another_qr_code',
      status: 'invalid_status',
      purchase_date: new Date(),
    })).rejects.toThrow();
  });

  it('should not create a ticket without required fields', async () => {
    await expect(Ticket.create({
      profile_id: profile.profile_id,
      tournament_id: tournament.tournament_id,
      // Missing qr_code and purchase_date
    })).rejects.toThrow();
  });

  it('should set default status to "purchased" if not specified', async () => {
    const ticket = await Ticket.create({
      profile_id: profile.profile_id,
      tournament_id: tournament.tournament_id,
      qr_code: 'default_status_qr_code',
      purchase_date: new Date(),
    });

    expect(ticket.status).toBe('purchased');
  });
});
