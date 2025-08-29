const express = require('express');
const { body } = require('express-validator');
// Fix: Change from 'controllers' to 'controller'
const PassengerController = require('../controller/passengerController');
const { verifyToken, requireActiveAccount } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');

const router = express.Router();

// All passenger routes require authentication
router.use(verifyToken);
router.use(requireActiveAccount);

// Validation middleware
const updatePreferencesValidation = [
  body('preferences').isObject().withMessage('Preferences must be an object'),
  body('preferences.notifications.email').optional().isBoolean().withMessage('Email notification preference must be boolean'),
  body('preferences.notifications.sms').optional().isBoolean().withMessage('SMS notification preference must be boolean'),
  body('preferences.notifications.push').optional().isBoolean().withMessage('Push notification preference must be boolean'),
  body('preferences.paymentMethod').optional().isIn(['cash', 'card', 'digital_wallet', 'bank_transfer']).withMessage('Invalid payment method'),
  body('preferences.language').optional().isIn(['en', 'si', 'ta']).withMessage('Invalid language'),
  handleValidationErrors
];

const addToFavoritesValidation = [
  body('routeId').notEmpty().withMessage('Route ID is required'),
  body('routeName').optional().trim().isLength({ min: 2 }).withMessage('Route name must be at least 2 characters'),
  handleValidationErrors
];

const subscribeTrackingValidation = [
  body('scheduleId').notEmpty().withMessage('Schedule ID is required'),
  handleValidationErrors
];

// Passenger dashboard and analytics
router.get('/dashboard', PassengerController.getDashboard);
router.get('/history', PassengerController.getTravelHistory);

// Preferences management
router.put('/preferences', updatePreferencesValidation, PassengerController.updatePreferences);

// Favorite routes management
router.get('/favorites', PassengerController.getFavoriteRoutes);
router.post('/favorites', addToFavoritesValidation, PassengerController.addToFavorites);
router.delete('/favorites/:routeId', PassengerController.removeFromFavorites);

// Real-time tracking
router.post('/tracking/subscribe', subscribeTrackingValidation, PassengerController.subscribeToTracking);
router.delete('/tracking/:scheduleId', PassengerController.unsubscribeFromTracking);
router.get('/tracking/:scheduleId/status', PassengerController.getScheduleStatus);
router.get('/tracking/:scheduleId/eta', PassengerController.calculateETA);

module.exports = router;