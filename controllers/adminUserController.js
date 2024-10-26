// controllers/adminUserController.js
const { User, Profile } = require('../models');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { Op } = require('sequelize');

/**
 * Get all users with optional filtering.
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (search) {
      where.email = { [Op.iLike]: `%${search}%` };
    }

    const { rows: users, count } = await User.findAndCountAll({
      where,
      include: [{ model: Profile }],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
    });

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        total: count,
        page: parseInt(page),
        pages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    console.error('Get All Users Error:', error);
    next(error);
  }
};

/**
 * Get a user by ID.
 */
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, { include: [Profile] });
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }
    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('Get User By ID Error:', error);
    next(error);
  }
};

/**
 * Update a user's details.
 */
exports.updateUser = async (req, res, next) => {
  try {
    // Validate input
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const { email, password, role } = req.body;
    if (email) user.email = email;
    if (password) user.password_hash = await bcrypt.hash(password, 12);
    if (role) user.role = role;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      data: user,
    });
  } catch (error) {
    console.error('Update User Error:', error);

    // Handle unique constraint error
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    next(error);
  }
};

/**
 * Delete a user.
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Delete user and associated profiles
    await user.destroy();

    res.status(200).json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete User Error:', error);
    next(error);
  }
};

