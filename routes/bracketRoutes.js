// routes/bracketRoutes.js
const express = require('express');
const router = express.Router();
const bracketController = require('../controllers/bracketController');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/authorize');

router.get('/tournament/:tournamentId', bracketController.getBracketByTournamentId);
router.post(
  '/tournament/:tournamentId/generate',
  authenticateToken,
  isAdmin,
  bracketController.generateBracket
);
router.put(
  '/:bracketId',
  authenticateToken,
  isAdmin,
  bracketController.updateBracket
);
router.get('/:bracketId', authenticateToken, isAdmin, bracketController.getBracketById);

module.exports = router;
