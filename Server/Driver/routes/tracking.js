const express = require('express');
const { body } = require('express-validator');
const { verifyToken, requireVerification } = require('../middleware/auth');
const { handleValidationErrors } = require('../middleware/validation');
const TrackingController = require('../controllers/trackingController');

const router = express.Router();

// All tracking routes require authentication and verification
router.use(verifyToken);
router.use(requireVerification);

// Validation middleware for location updates
const locationValidation = [
  body('latitude').isFloat({ min: -90, max: 90 }).withMessage('Invalid latitude'),
  body('longitude').isFloat({ min: -180, max: 180 }).withMessage('Invalid longitude'),
  body('scheduleId').optional().isString().withMessage('Schedule ID must be a string'),
  handleValidationErrors
];

// Tracking routes
router.post('/start', TrackingController.startTracking);
router.post('/update', locationValidation, TrackingController.updateLocation);
router.post('/stop', TrackingController.stopTracking);
router.get('/history', TrackingController.getTrackingHistory);

module.exports = router;