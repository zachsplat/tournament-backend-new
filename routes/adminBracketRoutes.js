// routes/adminBracketRoutes.js
const express = require('express');
const router = express.Router();
const bracketController = require('../controllers/bracketController');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/authorize');

// POST /api/admin/tournaments/:id/bracket - Generate Bracket for a Tournament
router.post(
  '/tournaments/:id/bracket',
  authenticateToken,
  isAdmin,
  bracketController.generateBracket
);

// GET /api/admin/brackets - Get All Brackets
router.get(
  '/brackets',
  authenticateToken,
  isAdmin,
  bracketController.getAllBrackets
);

module.exports = router;

