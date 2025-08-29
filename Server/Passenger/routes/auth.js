const express = require('express');
const { body } = require('express-validator');
const AuthController = require('../controller/authController');
const { verifyToken, requireActiveAccount } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('firstName').trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('phoneNumber').matches(/^[0-9+\-\s()]{10,15}$/).withMessage('Please provide a valid phone number'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('dateOfBirth').optional().isISO8601().withMessage('Please provide a valid date'),
  handleValidationErrors
];

const loginValidation = [
  body('email').isEmail().normalizeEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const verifyCitizenValidation = [
  body('citizenId').notEmpty().withMessage('Citizen ID is required'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors
];

const updateProfileValidation = [
  body('firstName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('First name must be 2-50 characters'),
  body('lastName').optional().trim().isLength({ min: 2, max: 50 }).withMessage('Last name must be 2-50 characters'),
  body('phone').optional().matches(/^[0-9+\-\s()]{10,15}$/).withMessage('Please provide a valid phone number'),
  handleValidationErrors
];

// PUBLIC ROUTES
router.post('/register', registerValidation, AuthController.register);
router.post('/login', loginValidation, AuthController.login);

// PROTECTED ROUTES (for temporary and verified passengers)
router.get('/profile', verifyToken, AuthController.getProfile);
router.put('/profile', verifyToken, updateProfileValidation, AuthController.updateProfile);

// CITIZEN VERIFICATION ROUTE
router.post('/verify-citizen', verifyToken, verifyCitizenValidation, AuthController.verifyCitizenId);

module.exports = router;