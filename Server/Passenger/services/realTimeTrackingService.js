const socketService = require('./socketService');
// COMMENTED OUT - Will implement later
// const notificationService = require('./notificationService');
const apiGateway = require('../config/apiGateway');

class RealTimeTrackingService {
  constructor() {
    this.trackedSchedules = new Map(); // scheduleId -> tracking data
    this.subscribedPassengers = new Map(); // scheduleId -> Set of passengerIds
    this.updateInterval = null;
    this.arrivalNotifications = new Map(); // Track sent notifications
  }

  // Start the tracking service
  start() {
    this.updateInterval = setInterval(() => {
      this.updateAllSchedules();
    }, parseInt(process.env.LOCATION_UPDATE_INTERVAL) || 5000);

    console.log('🚌 Real-time tracking service started');
  }

  // Stop the tracking service
  stop() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log('🚌 Real-time tracking service stopped');
  }

  // Subscribe passenger to route tracking
  subscribeToRoute(passengerId, scheduleId) {
    if (!this.subscribedPassengers.has(scheduleId)) {
      this.subscribedPassengers.set(scheduleId, new Set());
    }
    
    this.subscribedPassengers.get(scheduleId).add(passengerId);
    console.log(`👤 Passenger ${passengerId} subscribed to schedule ${scheduleId}`);
  }

  // Unsubscribe passenger from route tracking
  unsubscribeFromRoute(passengerId, scheduleId) {
    if (this.subscribedPassengers.has(scheduleId)) {
      this.subscribedPassengers.get(scheduleId).delete(passengerId);
      
      // Clean up empty subscriptions
      if (this.subscribedPassengers.get(scheduleId).size === 0) {
        this.subscribedPassengers.delete(scheduleId);
      }
    }
    console.log(`👤 Passenger ${passengerId} unsubscribed from schedule ${scheduleId}`);
  }

  // Update all tracked schedules
  async updateAllSchedules() {
    try {
      // Get all active schedules that have subscribers
      const subscribedScheduleIds = Array.from(this.subscribedPassengers.keys());
      
      if (subscribedScheduleIds.length === 0) return;

      // Fetch location updates for subscribed schedules
      for (const scheduleId of subscribedScheduleIds) {
        await this.updateScheduleLocation(scheduleId);
      }

    } catch (error) {
      console.error('Update all schedules error:', error);
    }
  }

  // Update specific schedule location
  async updateScheduleLocation(scheduleId) {
    try {
      // Get schedule data from NDX
      const scheduleResponse = await apiGateway.getSchedulesFromNDX({
        scheduleId,
        includeLocation: true
      });

      if (scheduleResponse.success && scheduleResponse.data.length > 0) {
        const schedule = scheduleResponse.data[0];
        
        const trackingData = {
          scheduleId,
          vehicleNumber: schedule.vehicleNumber,
          routeName: schedule.routeId?.name || 'Unknown Route',
          currentLocation: schedule.currentLocation,
          status: schedule.status,
          lastUpdate: new Date(),
          estimatedArrival: schedule.estimatedArrival,
          nextStop: schedule.nextStop,
          progress: schedule.progress || 0
        };

        // Update internal tracking
        this.trackedSchedules.set(scheduleId, trackingData);

        // Broadcast to subscribed passengers
        this.broadcastLocationUpdate(scheduleId, trackingData);

        // Check for arrival notifications
        await this.checkArrivalNotifications(scheduleId, trackingData);
      }

    } catch (error) {
      console.error(`Update schedule location error for ${scheduleId}:`, error);
    }
  }

  // Broadcast location update to subscribers
  broadcastLocationUpdate(scheduleId, trackingData) {
    if (socketService.io) {
      socketService.io.to(`schedule-${scheduleId}`).emit('location-update', {
        scheduleId,
        location: trackingData.currentLocation,
        status: trackingData.status,
        estimatedArrival: trackingData.estimatedArrival,
        nextStop: trackingData.nextStop,
        progress: trackingData.progress,
        timestamp: trackingData.lastUpdate.toISOString()
      });
    }
  }

  // Calculate ETA to passenger location
  async calculateETA(scheduleId, passengerLocation) {
    try {
      const trackingData = this.trackedSchedules.get(scheduleId);
      
      if (!trackingData || !trackingData.currentLocation) {
        return {
          success: false,
          message: 'Bus location not available'
        };
      }

      // Simple distance-based ETA calculation
      const distance = this.calculateDistance(
        trackingData.currentLocation.lat,
        trackingData.currentLocation.lng,
        passengerLocation.lat,
        passengerLocation.lng
      );

      // Assume average speed of 30 km/h in traffic
      const averageSpeed = 30; // km/h
      const etaMinutes = Math.round((distance / averageSpeed) * 60);

      return {
        success: true,
        data: {
          etaMinutes,
          distance: Math.round(distance * 100) / 100, // Round to 2 decimals
          busLocation: trackingData.currentLocation,
          passengerLocation,
          lastUpdate: trackingData.lastUpdate
        }
      };

    } catch (error) {
      console.error('Calculate ETA error:', error);
      return {
        success: false,
        message: 'Failed to calculate ETA',
        error: error.message
      };
    }
  }

  // Get current schedule status
  async getScheduleStatus(scheduleId) {
    try {
      const trackingData = this.trackedSchedules.get(scheduleId);
      
      if (trackingData) {
        return {
          success: true,
          data: trackingData
        };
      }

      // If not in cache, fetch from NDX
      const scheduleResponse = await apiGateway.getSchedulesFromNDX({
        scheduleId
      });

      if (scheduleResponse.success && scheduleResponse.data.length > 0) {
        const schedule = scheduleResponse.data[0];
        return {
          success: true,
          data: {
            scheduleId,
            status: schedule.status,
            currentLocation: schedule.currentLocation,
            estimatedArrival: schedule.estimatedArrival,
            nextStop: schedule.nextStop
          }
        };
      }

      return {
        success: false,
        message: 'Schedule not found'
      };

    } catch (error) {
      console.error('Get schedule status error:', error);
      return {
        success: false,
        message: 'Failed to get schedule status',
        error: error.message
      };
    }
  }

  // Check and send arrival notifications
  async checkArrivalNotifications(scheduleId, trackingData) {
    try {
      const subscribers = this.subscribedPassengers.get(scheduleId);
      
      if (!subscribers || subscribers.size === 0) return;

      // Check if bus is approaching (within 5 minutes or 2km)
      const isApproaching = trackingData.estimatedArrival && 
                           trackingData.estimatedArrival <= 5;

      if (isApproaching && !this.arrivalNotifications.has(scheduleId)) {
        // Mark notification as sent
        this.arrivalNotifications.set(scheduleId, Date.now());

        // Send notification to all subscribers
        for (const passengerId of subscribers) {
          // COMMENTED OUT - Will implement later
          // await this.sendArrivalNotification(passengerId, scheduleId, trackingData);
          console.log(`📱 Would send arrival notification to passenger ${passengerId} for schedule ${scheduleId}`);
        }
      }

      // Clean up old notifications (older than 30 minutes)
      const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
      for (const [key, timestamp] of this.arrivalNotifications.entries()) {
        if (timestamp < thirtyMinutesAgo) {
          this.arrivalNotifications.delete(key);
        }
      }

    } catch (error) {
      console.error('Arrival notification check error:', error);
    }
  }

  // Send arrival notification to passenger - COMMENTED OUT
  /*
  async sendArrivalNotification(passengerId, scheduleId, trackingData) {
    try {
      const Passenger = require('../model/Passenger');
      const passenger = await Passenger.findOne({ citizenId: passengerId });
      
      if (!passenger) return;

      const notificationData = {
        scheduleId,
        routeName: trackingData.routeName || 'Your Bus',
        vehicleNumber: trackingData.vehicleNumber,
        arrivalTime: trackingData.estimatedArrival,
        stopName: trackingData.nextStop?.name || 'Your Stop'
      };

      await notificationService.sendBusArrivalNotification(passenger, notificationData);

    } catch (error) {
      console.error('Send arrival notification error:', error);
    }
  }
  */

  // Calculate distance between two coordinates (Haversine formula)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Distance in kilometers
    return d;
  }

  deg2rad(deg) {
    return deg * (Math.PI / 180);
  }

  // Get tracking statistics
  getStats() {
    return {
      trackedSchedules: this.trackedSchedules.size,
      subscribedPassengers: Array.from(this.subscribedPassengers.values())
        .reduce((sum, set) => sum + set.size, 0),
      activeNotifications: this.arrivalNotifications.size
    };
  }
}

module.exports = new RealTimeTrackingService();