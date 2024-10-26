// routes/adminUserRoutes.js
const express = require('express');
const router = express.Router();
const adminUserController = require('../controllers/adminUserController');
const { authenticateToken } = require('../middleware/auth');
const { isAdmin } = require('../middleware/authorize');
const { body, param, query } = require('express-validator');

// Get All Users (Admin Only)
router.get(
  '/',
  authenticateToken,
  isAdmin,
  [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be at least 1.'),
    query('limit').optional().isInt({ min: 1 }).withMessage('Limit must be at least 1.'),
    query('search').optional().isString().withMessage('Search must be a string.'),
  ],
  adminUserController.getAllUsers
);

// Get User by ID (Admin Only)
router.get(
  '/:id',
  authenticateToken,
  isAdmin,
  [
    param('id').isInt().withMessage('User ID must be an integer.'),
  ],
  adminUserController.getUserById
);

// Update User (Admin Only)
router.put(
  '/:id',
  authenticateToken,
  isAdmin,
  [
    param('id').isInt().withMessage('User ID must be an integer.'),
    body('email').optional().isEmail().withMessage('Please provide a valid email address.'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long.')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter.')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter.')
      .matches(/\d/)
      .withMessage('Password must contain at least one digit.')
      .matches(/[\W_]/)
      .withMessage('Password must contain at least one special character.'),
    body('role').optional().isIn(['user', 'admin']).withMessage('Role must be either user or admin.'),
  ],
  adminUserController.updateUser
);

// Delete User (Admin Only)
router.delete(
  '/:id',
  authenticateToken,
  isAdmin,
  [
    param('id').isInt().withMessage('User ID must be an integer.'),
  ],
  adminUserController.deleteUser
);

module.exports = router;

