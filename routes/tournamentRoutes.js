// routes/tournamentRoutes.js
const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/authorize');
const { body } = require('express-validator');

// List Tournaments with Pagination & Filtering
router.get('/', tournamentController.listTournaments);

// Get Tournament Details
router.get('/:id', tournamentController.getTournamentDetails);

// Create Tournament (Admin Only)
router.post(
  '/',
  authenticateToken,
  isAdmin,
  [
    body('name').notEmpty().withMessage('Tournament name is required.'),
    body('description').notEmpty().withMessage('Description is required.'),
    body('date').isISO8601().withMessage('Date must be a valid ISO 8601 date.'),
    body('location').notEmpty().withMessage('Location is required.'),
    body('max_tickets').isInt({ min: 1 }).withMessage('Max tickets must be at least 1.'),
    body('price').isInt({ min: 0 }).withMessage('Price must be a non-negative integer.'),
  ],
  tournamentController.createTournament
);

// Update Tournament (Admin Only)
router.put(
  '/:id',
  authenticateToken,
  isAdmin,
  [
    body('name').optional().notEmpty().withMessage('Tournament name cannot be empty.'),
    body('description').optional().notEmpty().withMessage('Description cannot be empty.'),
    body('date').optional().isISO8601().withMessage('Date must be a valid ISO 8601 date.'),
    body('location').optional().notEmpty().withMessage('Location cannot be empty.'),
    body('max_tickets').optional().isInt({ min: 1 }).withMessage('Max tickets must be at least 1.'),
    body('price').optional().isInt({ min: 0 }).withMessage('Price must be a non-negative integer.'),
  ],
  tournamentController.updateTournament
);

// Delete Tournament (Admin Only)
router.delete('/:id', authenticateToken, isAdmin, tournamentController.deleteTournament);

module.exports = router;

