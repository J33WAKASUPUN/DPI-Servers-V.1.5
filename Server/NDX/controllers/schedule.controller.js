const Schedule = require('../models/Schedule');
const Route = require('../models/Route');

class ScheduleController {
  // Get schedule location
  static async getScheduleLocation(req, res) {
    try {
      const { id } = req.params;
      
      const schedule = await Schedule.findById(id);
      
      if (!schedule) {
        return res.status(404).json({
          success: false,
          message: 'Schedule not found'
        });
      }

      res.json({
        success: true,
        data: {
          scheduleId: schedule._id,
          currentLocation: schedule.currentLocation,
          lastLocationUpdate: schedule.lastLocationUpdate,
          status: schedule.status
        }
      });
    } catch (error) {
      console.error('Get schedule location error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get schedule location',
        error: error.message
      });
    }
  }

  // Update schedule location
  static async updateScheduleLocation(req, res) {
    try {
      const { id } = req.params;
      const { latitude, longitude } = req.body;
      
      const schedule = await Schedule.findByIdAndUpdate(
        id,
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
      console.error('Update schedule location error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update location',
        error: error.message
      });
    }
  }
}

module.exports = ScheduleController;