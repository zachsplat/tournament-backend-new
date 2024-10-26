// controllers/bracketController.js
const { Bracket, Tournament, Ticket, Profile } = require('../models');
const { Op } = require('sequelize');

exports.generateBracket = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;

    const tournament = await Tournament.findByPk(tournamentId);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found.' });
    }

    const tickets = await Ticket.findAll({
      where: { tournament_id: tournament.tournament_id, status: 'checked_in' },
      include: [
        {
          model: Profile,
          attributes: ['profile_id', 'name', 'category'],
        },
      ],
    });

    if (tickets.length < 2) {
      return res.status(400).json({ error: 'Not enough players to generate brackets.' });
    }

    const categories = {};
    tickets.forEach((ticket) => {
      const category = ticket.Profile.category;
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(ticket.Profile);
    });

    const brackets = {};
    for (const [category, players] of Object.entries(categories)) {
      if (players.length < 2) {
        continue;
      }
      const bracketData = generateBracketData(players);
      brackets[category] = bracketData;
    }

    let bracket = await Bracket.findOne({ where: { tournament_id: tournament.tournament_id } });
    if (bracket) {
      bracket.bracket_data = brackets;
      await bracket.save();
    } else {
      bracket = await Bracket.create({
        tournament_id: tournament.tournament_id,
        bracket_data: brackets,
      });
    }

    res.status(201).json({
      bracket_id: bracket.bracket_id,
      message: 'Brackets generated successfully.',
      bracket_data: bracket.bracket_data,
    });
  } catch (error) {
    console.error('Generate Bracket Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getBracketByTournamentId = async (req, res) => {
  try {
    const tournamentId = req.params.tournamentId;

    const bracket = await Bracket.findOne({ where: { tournament_id: tournamentId } });
    if (!bracket) {
      return res.status(404).json({ error: 'Bracket not found.' });
    }

    res.status(200).json({ data: bracket });
  } catch (error) {
    console.error('Get Bracket Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.updateBracket = async (req, res) => {
  try {
    const { bracketId } = req.params;
    const { bracket_data } = req.body;

    if (!bracket_data || typeof bracket_data !== 'object') {
      return res.status(400).json({ error: 'Invalid bracket data.' });
    }

    const bracket = await Bracket.findByPk(bracketId);
    if (!bracket) {
      return res.status(404).json({ error: 'Bracket not found.' });
    }

    bracket.bracket_data = bracket_data;
    await bracket.save();

    res.status(200).json({
      success: true,
      message: 'Bracket updated successfully.',
      data: bracket,
    });
  } catch (error) {
    console.error('Update Bracket Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getBracketById = async (req, res) => {
  try {
    const { bracketId } = req.params;
    
    const bracket = await Bracket.findByPk(bracketId);
    if (!bracket) {
      return res.status(404).json({ error: 'Bracket not found.' });
    }

    res.status(200).json({ success: true, data: bracket });
  } catch (error) {
    console.error('Get Bracket Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

function generateBracketData(players) {
  const shuffled = players.sort(() => 0.5 - Math.random());

  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      player1: shuffled[i],
      player2: shuffled[i + 1] || null,
      winner: null,
    });
  }

  const bracket = {
    rounds: [
      {
        round: 1,
        matches,
      },
    ],
  };

  let currentMatches = matches;
  let roundNumber = 1;
  while (currentMatches.length > 1) {
    roundNumber += 1;
    const nextRoundMatches = [];
    for (let i = 0; i < currentMatches.length; i += 2) {
      nextRoundMatches.push({
        player1: null,
        player2: null,
        winner: null,
      });
    }
    bracket.rounds.push({
      round: roundNumber,
      matches: nextRoundMatches,
    });
    currentMatches = nextRoundMatches;
  }

  return bracket;
}

