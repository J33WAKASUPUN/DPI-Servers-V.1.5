const express = require('express');
const { verifyToken } = require('../middleware/auth');
const DriverController = require('../controllers/driverController');

const router = express.Router();

// All driver routes require authentication
router.use(verifyToken);

// Driver profile routes
router.get('/profile', DriverController.getProfile);
router.put('/profile', DriverController.updateProfile);
router.patch('/status', DriverController.updateStatus);
router.get('/statistics', DriverController.getStatistics);

module.exports = router;