// controllers/tournamentController.js
const { Tournament, Ticket } = require('../models');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

// List tournaments with pagination and filtering
exports.listTournaments = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, date, location } = req.query;
    const offset = (page - 1) * limit;
    const where = {};

    if (search) {
      where.name = { [Op.iLike]: `%${search}%` };
    }

    if (date) {
      where.date = date;
    }

    if (location) {
      where.location = { [Op.iLike]: `%${location}%` };
    }

    const { rows: tournaments, count } = await Tournament.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['date', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: tournaments,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('List Tournaments Error:', error);
    next(error);
  }
};

// Get tournament details
exports.getTournamentDetails = async (req, res) => {
  try {
    const tournament = await Tournament.findByPk(req.params.id);

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found.' });
    }

    // Get the number of sold tickets
    const soldTicketsCount = await Ticket.count({
      where: { tournament_id: tournament.tournament_id },
    });

    // Prepare the response data
    const responseData = {
      ...tournament.toJSON(),
      sold_tickets: soldTicketsCount,
    };

    res.status(200).json({ data: responseData });
  } catch (error) {
    console.error('Get Tournament Details Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

// Create tournament
exports.createTournament = async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description, date, location, max_tickets, price } = req.body;

    // Create tournament
    const tournament = await Tournament.create({
      name,
      description,
      date,
      location,
      max_tickets,
      price,
    });

    res.status(201).json({
      success: true,
      data: { tournament_id: tournament.tournament_id },
      message: 'Tournament created successfully.',
    });
  } catch (error) {
    console.error('Create Tournament Error:', error);
    next(error);
  }
};

// Update tournament
exports.updateTournament = async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description, date, location, max_tickets, price } = req.body;

    const tournament = await Tournament.findByPk(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found.' });
    }

    // Update tournament fields
    if (name) tournament.name = name;
    if (description) tournament.description = description;
    if (date) tournament.date = date;
    if (location) tournament.location = location;
    if (max_tickets !== undefined) tournament.max_tickets = max_tickets;
    if (price !== undefined) tournament.price = price;

    await tournament.save();

    res.status(200).json({
      success: true,
      message: 'Tournament updated successfully.',
      data: tournament,
    });
  } catch (error) {
    console.error('Update Tournament Error:', error);
    next(error);
  }
};

// Delete tournament
exports.deleteTournament = async (req, res, next) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findByPk(id);
    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found.' });
    }

    // Check for related tickets
    const ticketCount = await Ticket.count({ where: { tournament_id: id } });
    if (ticketCount > 0) {
      return res.status(400).json({ error: 'Cannot delete tournament with existing tickets.' });
    }

    await tournament.destroy();

    res.status(200).json({ success: true, message: 'Tournament deleted successfully.' });
  } catch (error) {
    console.error('Delete Tournament Error:', error);
    next(error);
  }
};

