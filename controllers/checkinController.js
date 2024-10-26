// controllers/checkinController.js
const { Ticket, Profile, Tournament } = require('../models');
const crypto = require('crypto');

/**
 * Scan QR code to check in a participant.
 * This method verifies the QR code and updates the ticket status to 'checked_in'.
 */
exports.scanQR = async (req, res, next) => {
  try {
    const { qr_data } = req.body;

    if (!qr_data) {
      return res.status(400).json({ error: 'QR data is required.' });
    }

    // Decode and parse QR data
    let decodedData;
    try {
      decodedData = Buffer.from(qr_data, 'base64').toString('utf-8');
    } catch (err) {
      return res.status(400).json({ error: 'Invalid QR code format.' });
    }

    let qrDataObj;
    try {
      qrDataObj = JSON.parse(decodedData);
    } catch (err) {
      return res.status(400).json({ error: 'Malformed QR code data.' });
    }

    const { ticket_id, signature } = qrDataObj;

    if (!ticket_id || !signature) {
      return res.status(400).json({ error: 'Incomplete QR code data.' });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', process.env.QR_SECRET)
      .update(`${ticket_id}`)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ error: 'Invalid QR code signature.' });
    }

    // Find ticket
    const ticket = await Ticket.findOne({
      where: { ticket_id },
      include: [
        {
          model: Profile,
          attributes: ['profile_id', 'name'],
        },
        {
          model: Tournament,
          attributes: ['tournament_id', 'name', 'date'],
        },
      ],
    });

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found.' });
    }

    if (ticket.status === 'checked_in') {
      return res.status(409).json({ error: 'Ticket already checked in.' });
    }

    // Update ticket status to 'checked_in'
    ticket.status = 'checked_in';
    await ticket.save();

    res.status(200).json({
      success: true,
      message: 'Check-in successful.',
      data: {
        ticket_id: ticket.ticket_id,
        profile_name: ticket.Profile.name,
        tournament_name: ticket.Tournament.name,
      },
    });
  } catch (error) {
    console.error('Scan QR Error:', error);
    next(error);
  }
};

