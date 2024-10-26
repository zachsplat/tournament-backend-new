// tests/models/bracket.test.js
const { Bracket, Tournament } = require('../../models');

describe('Bracket Model', () => {
  let tournament;

  beforeAll(async () => {
    await Bracket.sync({ force: true }); // Reset Bracket table before tests
    await Tournament.sync({ force: true }); // Reset Tournament table before tests

    // Create a tournament
    tournament = await Tournament.create({
      name: 'Bracket Model Tournament',
      description: 'Tournament for testing Bracket model.',
      date: '2024-08-15',
      location: 'Bracket City',
      max_tickets: 10,
      price: 3500,
    });
  });

  it('should create a bracket with valid data', async () => {
    const bracketData = {
      rounds: [
        {
          round: 1,
          matches: [
            { player1: { profile_id: 1, name: 'Player 1' }, player2: { profile_id: 2, name: 'Player 2' }, winner: null },
            { player1: { profile_id: 3, name: 'Player 3' }, player2: { profile_id: 4, name: 'Player 4' }, winner: null },
          ],
        },
      ],
    };

    const bracket = await Bracket.create({
      tournament_id: tournament.tournament_id,
      bracket_data: bracketData,
    });

    expect(bracket).toHaveProperty('bracket_id');
    expect(bracket.tournament_id).toBe(tournament.tournament_id);
    expect(bracket.bracket_data).toEqual(bracketData);
  });

  it('should not create a bracket without bracket_data', async () => {
    await expect(Bracket.create({
      tournament_id: tournament.tournament_id,
      // Missing bracket_data
    })).rejects.toThrow();
  });

  it('should allow updating bracket data', async () => {
    const bracket = await Bracket.create({
      tournament_id: tournament.tournament_id,
      bracket_data: { rounds: [] },
    });

    const updatedData = { rounds: [{ round: 1, matches: [] }] };
    bracket.bracket_data = updatedData;
    await bracket.save();

    expect(bracket.bracket_data).toEqual(updatedData);
  });
});
