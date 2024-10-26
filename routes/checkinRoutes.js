// routes/checkinRoutes.js
const express = require('express');
const router = express.Router();
const checkinController = require('../controllers/checkinController');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/authorize');
const { body } = require('express-validator');

// Check-in Participant by Scanning QR Code (Admin Only)
router.post(
  '/',
  authenticateToken,
  isAdmin,
  [
    body('qr_data').notEmpty().withMessage('QR data is required.'),
  ],
  checkinController.scanQR
);

module.exports = router;

