const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phone').matches(/^[0-9]{10}$/).withMessage('Please provide a valid 10-digit phone number'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('licenseNumber').trim().isLength({ min: 5, max: 20 }).withMessage('License number must be 5-20 characters'),
  body('vehicleNumber').trim().isLength({ min: 5, max: 15 }).withMessage('Vehicle number must be 5-15 characters'),
  body('vehicleType').isIn(['bus', 'van', 'car', 'truck']).withMessage('Invalid vehicle type')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// PUBLIC ROUTES (No authentication required)
router.post('/register', registerValidation, authController.register);
router.post('/login', loginValidation, authController.login);

// PROTECTED ROUTES (Authentication required)
const { verifyToken } = require('../middleware/auth');
router.post('/logout', verifyToken, authController.logout);
router.post('/refresh-token', verifyToken, authController.refreshToken);

module.exports = router;