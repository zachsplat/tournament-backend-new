// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { body } = require('express-validator');

// Register Route
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email address.'),
    body('password')
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
  ],
  authController.register
);

// Login Route
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email address.'),
    body('password').exists().withMessage('Password is required.'),
  ],
  authController.login
);

module.exports = router;

