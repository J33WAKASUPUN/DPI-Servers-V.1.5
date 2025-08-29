const apiGatewayService = require('../config/apiGateway');

class ScheduleController {
  // Get schedules from NDX through API Gateway
  static async getSchedules(req, res) {
    try {
      const driver = req.driver;
      const { status, date } = req.query;

      // Fetch schedules from NDX via API Gateway
      const schedulesData = await apiGatewayService.getSchedules(driver._id);

      let schedules = schedulesData.data || [];

      // Filter by status if provided
      if (status) {
        schedules = schedules.filter(schedule => schedule.status === status);
      }

      // Filter by date if provided
      if (date) {
        const filterDate = new Date(date);
        schedules = schedules.filter(schedule => {
          const scheduleDate = new Date(schedule.departureTime);
          return scheduleDate.toDateString() === filterDate.toDateString();
        });
      }

      res.json({
        success: true,
        data: schedules,
        total: schedules.length
      });
    } catch (error) {
      console.error('Get schedules error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get schedules',
        error: error.message
      });
    }
  }

  // Get active schedules
  static async getActiveSchedules(req, res) {
    try {
      const driver = req.driver;

      const schedulesData = await apiGatewayService.getSchedules(driver._id);
      const activeSchedules = (schedulesData.data || []).filter(
        schedule => schedule.status === 'active' || schedule.status === 'scheduled'
      );

      res.json({
        success: true,
        data: activeSchedules,
        total: activeSchedules.length
      });
    } catch (error) {
      console.error('Get active schedules error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get active schedules',
        error: error.message
      });
    }
  }

  // Accept a schedule assignment
  static async acceptSchedule(req, res) {
    try {
      const driver = req.driver;
      const { scheduleId } = req.body;

      if (!scheduleId) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID is required'
        });
      }

      // Update driver's current journey
      driver.currentJourney = {
        scheduleId,
        status: 'assigned',
        startedAt: new Date()
      };
      await driver.save();

      res.json({
        success: true,
        message: 'Schedule accepted successfully',
        data: {
          scheduleId,
          status: 'assigned'
        }
      });
    } catch (error) {
      console.error('Accept schedule error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept schedule',
        error: error.message
      });
    }
  }

  // Start a journey
  static async startJourney(req, res) {
    try {
      const driver = req.driver;
      const { scheduleId } = req.body;

      if (!scheduleId) {
        return res.status(400).json({
          success: false,
          message: 'Schedule ID is required'
        });
      }

      // Start journey through NDX
      const journeyData = await apiGatewayService.startJourney(scheduleId);

      // Update driver's current journey
      driver.currentJourney = {
        journeyId: journeyData.data?._id,
        scheduleId,
        status: 'started',
        startedAt: new Date()
      };
      driver.isOnline = true;
      await driver.save();

      res.json({
        success: true,
        message: 'Journey started successfully',
        data: journeyData.data
      });
    } catch (error) {
      console.error('Start journey error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start journey',
        error: error.message
      });
    }
  }
}

module.exports = ScheduleController;