const express = require('express');
const DataController = require('../controllers/dataController');

const router = express.Router();

// Public routes for location search and route management
router.get('/search-locations', DataController.searchLocations);
router.get('/find-routes', DataController.findRoutes);
router.get('/nearby-stops', DataController.getNearbyStops);
router.get('/:routeId/details', DataController.getRouteDetails);

// Route management routes
router.get('/', async (req, res) => {
  try {
    const Route = require('../models/Route');
    const routes = await Route.find().populate('schedules');
    
    res.json({
      success: true,
      data: routes
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get routes',
      error: error.message
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const Route = require('../models/Route');
    const route = new Route(req.body);
    await route.save();
    
    res.status(201).json({
      success: true,
      message: 'Route created successfully',
      data: route
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create route',
      error: error.message
    });
  }
});

module.exports = router;