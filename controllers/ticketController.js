// controllers/ticketController.js
const { Ticket, Profile, Tournament, sequelize } = require('../models');
const { validationResult } = require('express-validator');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const QRCode = require('qrcode');
const crypto = require('crypto');
const { Op } = require('sequelize');

/**
 * Purchase a ticket for a tournament.
 * This method handles ticket purchasing with concurrency control to prevent overselling.
 */
exports.purchaseTicket = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await transaction.rollback();
      return res.status(400).json({ errors: errors.array() });
    }

    const { tournament_id, payment_method_id } = req.body;
    const profileId = req.params.profileId;

    // Verify Profile Ownership
    const profile = await Profile.findOne({
      where: { profile_id: profileId, user_id: req.user.user_id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!profile) {
      await transaction.rollback();
      return res.status(403).json({ error: 'Unauthorized access to the specified profile.' });
    }

    // Fetch Tournament with Row-Level Lock
    const tournament = await Tournament.findByPk(tournament_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!tournament) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Tournament not found.' });
    }

    // Check Ticket Availability
    const ticketCount = await Ticket.count({
      where: { tournament_id: tournament.tournament_id },
      transaction,
    });

    if (ticketCount >= tournament.max_tickets) {
      await transaction.rollback();
      return res.status(400).json({ error: 'Tickets are sold out for this tournament.' });
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: tournament.price * 100,
      currency: 'usd',
      payment_method: payment_method_id,
      confirm: true,
    });

    // Create Ticket Record
    const ticket = await Ticket.create(
      {
        profile_id: profile.profile_id,
        tournament_id: tournament.tournament_id,
        qr_code: '', // Placeholder
        status: 'purchased',
        purchase_date: new Date(),
        payment_intent_id: paymentIntent.id,
      },
      { transaction }
    );

    // Generate QR Code Data
    const qrDataObj = {
      ticket_id: ticket.ticket_id,
      signature: crypto
        .createHmac('sha256', process.env.QR_SECRET)
        .update(`${ticket.ticket_id}`)
        .digest('hex'),
    };

    const qrData = Buffer.from(JSON.stringify(qrDataObj)).toString('base64');

    // Update Ticket with QR Code Data
    ticket.qr_code = qrData;
    await ticket.save({ transaction });

    // Commit the Transaction
    await transaction.commit();

    res.status(201).json({
      success: true,
      message: 'Ticket purchased successfully.',
      data: {
        ticket_id: ticket.ticket_id,
      },
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Purchase Ticket Error:', error);
    res.status(500).json({ error: 'An unexpected error occurred. Please try again later.' });
  }
};
/**
 * Get all tickets for a user's profile with pagination and filtering.
 */
exports.getUserTickets = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status, tournament } = req.query;
    const offset = (page - 1) * limit;

    const profileId = req.params.profileId;

    // Verify profile belongs to user
    const profile = await Profile.findOne({
      where: { profile_id: profileId, user_id: req.user.user_id },
    });

    if (!profile) {
      return res.status(403).json({ error: 'Unauthorized access to the specified profile.' });
    }

    const where = { profile_id: profile.profile_id };

    if (status) {
      where.status = status;
    }

    if (tournament) {
      where.tournament_id = tournament;
    }

    const { rows: tickets, count } = await Ticket.findAndCountAll({
      where,
      include: [{ model: Tournament, attributes: ['name', 'date', 'location'] }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['purchase_date', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get User Tickets Error:', error);
    next(error);
  }
};

/**
 * Get a specific ticket by ID for a user's profile.
 */
exports.getTicketById = async (req, res, next) => {
  try {
    const { profileId, ticketId } = req.params;

    // Verify profile belongs to user
    const profile = await Profile.findOne({
      where: { profile_id: profileId, user_id: req.user.user_id },
    });

    if (!profile) {
      return res.status(403).json({ error: 'Unauthorized access to the specified profile.' });
    }

    const ticket = await Ticket.findOne({
      where: { ticket_id: ticketId, profile_id: profile.profile_id },
      include: [{ model: Tournament, attributes: ['name', 'date', 'location'] }],
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    res.status(200).json({ success: true, data: ticket });
  } catch (error) {
    console.error('Get Ticket By ID Error:', error);
    next(error);
  }
};

/**
 * Cancel a ticket and process a refund via Stripe.
 */
exports.cancelTicket = async (req, res, next) => {
  try {
    const { profileId, ticketId } = req.params;

    // Verify profile belongs to user
    const profile = await Profile.findOne({
      where: { profile_id: profileId, user_id: req.user.user_id },
    });

    if (!profile) {
      return res.status(403).json({ error: 'Unauthorized access to the specified profile.' });
    }

    const ticket = await Ticket.findOne({ where: { ticket_id: ticketId, profile_id: profile.profile_id } });
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.status !== 'purchased') {
      return res.status(400).json({ error: 'Only purchased tickets can be canceled.' });
    }

    // Process refund via Stripe
    const refund = await stripe.refunds.create({
      payment_intent: ticket.payment_intent_id,
    });

    if (refund.status !== 'succeeded') {
      return res.status(500).json({ error: 'Refund failed. Please contact support.' });
    }

    // Update ticket status
    ticket.status = 'canceled';
    await ticket.save();

    res.status(200).json({ success: true, message: 'Ticket canceled and refund processed successfully.' });
  } catch (error) {
    console.error('Cancel Ticket Error:', error);

    // Handle specific Stripe errors
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({ error: 'Invalid refund request. Please check the ticket details.' });
    }

    next(error);
  }
};

