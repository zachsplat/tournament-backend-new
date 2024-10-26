// routes/profileRoutes.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middleware/auth');
const upload = require('../config/multer');
const { body } = require('express-validator');

const validCategories = ['Youth', 'Teen Male', 'Teen Female', 'Adult Male', 'Adult Female'];

router.post(
  '/',
  authenticateToken,
  upload.single('avatar'),
  [
    body('name').notEmpty().withMessage('Name is required.'),
    body('bio').optional().isString().withMessage('Bio must be a string.'),
    body('category')
      .notEmpty()
      .withMessage('Category is required.')
      .isIn(validCategories)
      .withMessage(`Category must be one of: ${validCategories.join(', ')}.`),
  ],
  profileController.createProfile
);

router.put(
  '/:profileId',
  authenticateToken,
  upload.single('avatar'),
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty.'),
    body('bio').optional().isString().withMessage('Bio must be a string.'),
    body('category')
      .optional()
      .isIn(validCategories)
      .withMessage(`Category must be one of: ${validCategories.join(', ')}.`),
  ],
  profileController.updateProfile
);

router.get('/', authenticateToken, profileController.getUserProfiles);
router.delete('/:profileId', authenticateToken, profileController.deleteProfile);

module.exports = router;

