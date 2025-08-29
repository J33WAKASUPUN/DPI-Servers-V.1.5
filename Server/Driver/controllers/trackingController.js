const TrackingData = require('../models/TrackingData');
const Driver = require('../models/Driver');
const apiGatewayService = require('../config/apiGateway');

class TrackingController {
  // Start location tracking
  static async startTracking(req, res) {
    try {
      const driver = req.driver;
      const { scheduleId, journeyId } = req.body;

      if (!scheduleId) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID is required'
        });
      }

      // Update driver status
      driver.isOnline = true;
      driver.lastActive = new Date();
      await driver.save();

      res.json({
        success: true,
        message: 'Tracking started successfully',
        data: {
          driverId: driver._id,
          scheduleId,
          journeyId,
          isOnline: driver.isOnline,
          startedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Start tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start tracking',
        error: error.message
      });
    }
  }

  // Update driver location
  static async updateLocation(req, res) {
    try {
      const driver = req.driver;
      const { 
        latitude, 
        longitude, 
        bearing, 
        speed, 
        accuracy,
        scheduleId,
        journeyId
      } = req.body;

      // Validate coordinates
      if (!latitude || !longitude) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinates'
        });
      }

      // Create tracking data record
      const trackingData = new TrackingData({
        driverId: driver._id,
        scheduleId: scheduleId || driver.currentJourney?.scheduleId,
        journeyId: journeyId || driver.currentJourney?.journeyId,
        location: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        bearing: bearing || 0,
        speed: speed || 0,
        accuracy: accuracy || 0,
        timestamp: new Date()
      });

      await trackingData.save();

      // Update driver's current location
      await driver.updateLocation({
        latitude,
        longitude,
        bearing,
        speed,
        accuracy
      });

      // Update journey tracking through NDX if journey is active
      if (driver.currentJourney?.journeyId) {
        try {
          await apiGatewayService.updateJourneyTracking(
            driver.currentJourney.journeyId,
            { latitude, longitude, bearing, speed, timestamp: new Date() }
          );
        } catch (error) {
          console.error('Failed to update NDX tracking:', error);
          // Don't fail the request if NDX update fails
        }
      }

      res.json({
        success: true,
        message: 'Location updated successfully',
        data: {
          driverId: driver._id,
          location: { latitude, longitude },
          bearing,
          speed,
          timestamp: trackingData.timestamp,
          scheduleId: trackingData.scheduleId
        }
      });
    } catch (error) {
      console.error('Update location error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update location',
        error: error.message
      });
    }
  }

  // Stop tracking
  static async stopTracking(req, res) {
    try {
      const driver = req.driver;

      // Complete journey if active
      if (driver.currentJourney?.journeyId) {
        try {
          await apiGatewayService.completeJourney(driver.currentJourney.journeyId);
        } catch (error) {
          console.error('Failed to complete journey in NDX:', error);
        }
      }

      // Update driver status
      driver.isOnline = false;
      driver.currentJourney = {
        status: 'completed'
      };
      driver.totalJourneys += 1;
      await driver.save();

      res.json({
        success: true,
        message: 'Tracking stopped successfully',
        data: {
          driverId: driver._id,
          isOnline: driver.isOnline,
          stoppedAt: new Date()
        }
      });
    } catch (error) {
      console.error('Stop tracking error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop tracking',
        error: error.message
      });
    }
  }

  // Get tracking history
  static async getTrackingHistory(req, res) {
    try {
      const driver = req.driver;
      const { 
        scheduleId, 
        startDate, 
        endDate, 
        limit = 100, 
        page = 1 
      } = req.query;

      const query = { driverId: driver._id };

      if (scheduleId) {
        query.scheduleId = scheduleId;
      }

      if (startDate || endDate) {
        query.timestamp = {};
        if (startDate) query.timestamp.$gte = new Date(startDate);
        if (endDate) query.timestamp.$lte = new Date(endDate);
      }

      const skip = (parseInt(page) - 1) * parseInt(limit);

      const trackingData = await TrackingData.find(query)
        .sort({ timestamp: -1 })
        .limit(parseInt(limit))
        .skip(skip);

      const total = await TrackingData.countDocuments(query);

      res.json({
        success: true,
        data: trackingData,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error('Get tracking history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get tracking history',
        error: error.message
      });
    }
  }
}

module.exports = TrackingController;