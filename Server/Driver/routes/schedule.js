const express = require('express');
const { verifyToken, requireVerification } = require('../middleware/auth');
const ScheduleController = require('../controllers/scheduleController');

const router = express.Router();

// All schedule routes require authentication
router.use(verifyToken);
router.use(requireVerification); // Driver must be verified

// Schedule management routes
router.get('/', ScheduleController.getSchedules);
router.get('/active', ScheduleController.getActiveSchedules);
router.post('/accept', ScheduleController.acceptSchedule);
router.post('/start', ScheduleController.startJourney);

module.exports = router;