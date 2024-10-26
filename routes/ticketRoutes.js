// routes/ticketRoutes.js
const express = require('express');
const router = express.Router({ mergeParams: true });
const ticketController = require('../controllers/ticketController');
const { authenticateToken } = require('../middleware/auth');
const { body } = require('express-validator');

// Purchase Ticket
router.post(
  '/',
  authenticateToken,
  [
    body('tournament_id').isInt().withMessage('Tournament ID must be an integer.'),
    body('payment_token').notEmpty().withMessage('Payment token is required.'),
  ],
  ticketController.purchaseTicket
);

// Get All Tickets for Profile with Pagination and Filtering
router.get('/', authenticateToken, ticketController.getUserTickets);

// Get Single Ticket by ID
router.get('/:ticketId', authenticateToken, ticketController.getTicketById);

// Cancel Ticket
router.post('/:ticketId/cancel', authenticateToken, ticketController.cancelTicket);

module.exports = router;

