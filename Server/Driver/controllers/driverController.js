const Driver = require('../models/Driver');
const TrackingData = require('../models/TrackingData');

class DriverController {
  // Get driver profile
  static async getProfile(req, res) {
    try {
      const driver = req.driver;
      
      res.json({
        success: true,
        data: {
          driver: {
            id: driver._id,
            firstName: driver.firstName,
            lastName: driver.lastName,
            email: driver.email,
            phone: driver.phone,
            licenseNumber: driver.licenseNumber,
            licenseExpiry: driver.licenseExpiry,
            vehicleNumber: driver.vehicleNumber,
            vehicleType: driver.vehicleType,
            status: driver.status,
            isVerified: driver.isVerified,
            currentJourney: driver.currentJourney,
            currentLocation: driver.currentLocation,
            isOnline: driver.isOnline,
            totalJourneys: driver.totalJourneys,
            rating: driver.rating
          }
        }
      });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get profile',
        error: error.message
      });
    }
  }

  // Update driver profile
  static async updateProfile(req, res) {
    try {
      const driver = req.driver;
      const updates = req.body;
      
      // Only allow certain fields to be updated
      const allowedUpdates = ['firstName', 'lastName', 'phone', 'vehicleNumber', 'vehicleType'];
      const actualUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedUpdates.includes(key)) {
          actualUpdates[key] = updates[key];
        }
      });

      if (Object.keys(actualUpdates).length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No valid updates provided'
        });
      }

      Object.assign(driver, actualUpdates);
      await driver.save();

      res.json({
        success: true,
        message: 'Profile updated successfully',
        data: { driver }
      });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update profile',
        error: error.message
      });
    }
  }

  // Update driver status
  static async updateStatus(req, res) {
    try {
      const driver = req.driver;
      const { isOnline } = req.body;
      
      driver.isOnline = isOnline;
      driver.lastActive = new Date();
      await driver.save();

      res.json({
        success: true,
        message: 'Status updated successfully',
        data: {
          isOnline: driver.isOnline,
          lastActive: driver.lastActive
        }
      });
    } catch (error) {
      console.error('Update status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update status',
        error: error.message
      });
    }
  }

  // Get driver statistics
  static async getStatistics(req, res) {
    try {
      const driver = req.driver;
      const { period = '30' } = req.query; // days

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      // Get tracking data for the period
      const trackingData = await TrackingData.find({
        driverId: driver._id,
        timestamp: { $gte: startDate }
      });

      // Calculate statistics
      const totalDistanceCovered = trackingData.length > 0 
        ? trackingData.reduce((total, data) => total + (data.speed || 0), 0)
        : 0;

      const averageSpeed = trackingData.length > 0
        ? trackingData.reduce((total, data) => total + (data.speed || 0), 0) / trackingData.length
        : 0;

      res.json({
        success: true,
        data: {
          period: `${period} days`,
          totalJourneys: driver.totalJourneys,
          totalDistanceCovered: Math.round(totalDistanceCovered * 100) / 100,
          averageSpeed: Math.round(averageSpeed * 100) / 100,
          rating: driver.rating,
          isOnline: driver.isOnline,
          lastActive: driver.lastActive,
          trackingPoints: trackingData.length
        }
      });
    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get statistics',
        error: error.message
      });
    }
  }
}

module.exports = DriverController;