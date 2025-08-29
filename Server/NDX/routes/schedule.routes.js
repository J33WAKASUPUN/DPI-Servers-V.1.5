const express = require('express');
const Schedule = require('../models/Schedule');
const Route = require('../models/Route');

const router = express.Router();

// Get all schedules
router.get('/', async (req, res) => {
  try {
    const schedules = await Schedule.find()
      .populate('routeId')
      .sort({ departureTime: 1 });
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get schedules',
      error: error.message
    });
  }
});

// Get schedules for a specific route
router.get('/route/:routeId', async (req, res) => {
  try {
    const { routeId } = req.params;
    const schedules = await Schedule.find({ routeId })
      .populate('routeId')
      .sort({ departureTime: 1 });
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get schedules for route',
      error: error.message
    });
  }
});

// Get schedules for a specific driver
router.get('/driver/:driverId', async (req, res) => {
  try {
    const { driverId } = req.params;
    const schedules = await Schedule.find({ driverId })
      .populate('routeId')
      .sort({ departureTime: 1 });
    
    res.json({
      success: true,
      data: schedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get driver schedules',
      error: error.message
    });
  }
});

// Create new schedule
router.post('/', async (req, res) => {
  try {
    const schedule = new Schedule(req.body);
    await schedule.save();
    
    res.status(201).json({
      success: true,
      message: 'Schedule created successfully',
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create schedule',
      error: error.message
    });
  }
});

// Update schedule location (for driver app)
router.post('/:scheduleId/location', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { latitude, longitude } = req.body;
    
    const schedule = await Schedule.findByIdAndUpdate(
      scheduleId,
      {
        currentLocation: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        lastLocationUpdate: new Date()
      },
      { new: true }
    );
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Location updated successfully',
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update location',
      error: error.message
    });
  }
});

// Update schedule status
router.patch('/:scheduleId/status', async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { status } = req.body;
    
    const schedule = await Schedule.findByIdAndUpdate(
      scheduleId,
      { status },
      { new: true }
    );
    
    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Schedule status updated',
      data: schedule
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule status',
      error: error.message
    });
  }
});

// Get active schedules (for driver dashboard)
router.get('/active', async (req, res) => {
  try {
    const activeSchedules = await Schedule.find({
      status: { $in: ['scheduled', 'active'] },
      departureTime: { $gte: new Date() }
    })
    .populate('routeId')
    .sort({ departureTime: 1 });
    
    res.json({
      success: true,
      data: activeSchedules
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get active schedules',
      error: error.message
    });
  }
});

module.exports = router;