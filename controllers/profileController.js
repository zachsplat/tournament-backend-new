// controllers/profileController.js
const { Profile, Ticket } = require('../models');
const { validationResult } = require('express-validator');
const path = require('path');

const validCategories = ['Youth', 'Teen Male', 'Teen Female', 'Adult Male', 'Adult Female'];

exports.createProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { category } = req.body;
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: 'Invalid category provided.' });
    }

    let avatarUrl = null;
    if (req.file) {
      avatarUrl = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    }

    const profile = await Profile.create({
      user_id: req.user.user_id,
      name: req.body.name,
      avatar: avatarUrl,
      bio: req.body.bio || null,
      category,
    });

    res.status(201).json({
      success: true,
      data: {
        profile_id: profile.profile_id,
        message: 'Profile created successfully.',
        avatar: avatarUrl,
      },
    });
  } catch (error) {
    console.error('Create Profile Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.getUserProfiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, name, category } = req.query;
    const offset = (page - 1) * limit;

    const where = { user_id: req.user.user_id };

    if (name) {
      where.name = { [Op.iLike]: `%${name}%` };
    }
    
    if (category && validCategories.includes(category)) {
      where.category = category;
    }

    const { rows: profiles, count } = await Profile.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['name', 'ASC']],
    });

    res.status(200).json({
      success: true,
      data: profiles,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get User Profiles Error:', error);
    next(error);
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { profileId } = req.params;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const profile = await Profile.findOne({
      where: { profile_id: profileId, user_id: req.user.user_id },
    });
    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    if (req.file) {
      profile.avatar = `${req.protocol}://${req.get('host')}/uploads/avatars/${req.file.filename}`;
    }

    const { name, bio, category } = req.body;
    if (name) profile.name = name;
    if (bio) profile.bio = bio;
    if (category && validCategories.includes(category)) {
      profile.category = category;
    }

    await profile.save();

    res.status(200).json({
      success: true,
      data: {
        message: 'Profile updated successfully.',
        profile,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({ error: 'Internal server error.' });
  }
};

exports.deleteProfile = async (req, res, next) => {
  try {
    const { profileId } = req.params;

    const profile = await Profile.findOne({
      where: { profile_id: profileId, user_id: req.user.user_id },
    });

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found.' });
    }

    const ticketCount = await Ticket.count({ where: { profile_id: profileId } });
    if (ticketCount > 0) {
      return res.status(400).json({ error: 'Cannot delete profile with existing tickets.' });
    }

    await profile.destroy();

    res.status(200).json({ success: true, message: 'Profile deleted successfully.' });
  } catch (error) {
    console.error('Delete Profile Error:', error);
    next(error);
  }
};

