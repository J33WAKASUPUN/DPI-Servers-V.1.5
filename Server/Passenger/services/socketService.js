const { Server } = require("socket.io");
const apiGateway = require("../config/apiGateway");

class SocketService {
  constructor() {
    this.io = null;
    this.subscribedRoutes = new Map(); // routeId -> Set of socketIds
    this.subscribedSchedules = new Map(); // scheduleId -> Set of socketIds
    this.socketToPassenger = new Map(); // socketId -> passengerId
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.CORS_ORIGINS?.split(",") || [
          "http://localhost:3000",
          "http://192.168.43.187:3000",
          "http://localhost:3006",
        ],
        credentials: true,
      },
    });

    this.setupEventHandlers();
    this.startLocationUpdateInterval();

    console.log("📡 Socket.IO service initialized for passenger app");
  }

  setupEventHandlers() {
    this.io.on("connection", (socket) => {
      console.log(`🔌 Passenger connected: ${socket.id}`);

      // Handle passenger authentication
      socket.on("authenticate", (data) => {
        if (data.passengerId) {
          this.socketToPassenger.set(socket.id, data.passengerId);
          socket.join(`passenger-${data.passengerId}`);
          console.log(`✅ Passenger authenticated: ${data.passengerId}`);

          socket.emit("authenticated", {
            success: true,
            message: "Successfully authenticated",
          });
        }
      });

      // Handle route subscription for live bus tracking
      socket.on("subscribe-route", (data) => {
        const { routeId } = data;
        if (routeId) {
          socket.join(`route-${routeId}`);

          if (!this.subscribedRoutes.has(routeId)) {
            this.subscribedRoutes.set(routeId, new Set());
          }
          this.subscribedRoutes.get(routeId).add(socket.id);

          console.log(`📍 Socket ${socket.id} subscribed to route: ${routeId}`);

          socket.emit("route-subscribed", {
            routeId,
            message: "Successfully subscribed to route updates",
          });

          // Send current live buses on this route
          this.sendCurrentLiveBuses(socket, routeId);
        }
      });

      // Handle schedule subscription for specific bus tracking
      socket.on("subscribe-schedule", (data) => {
        const { scheduleId } = data;
        if (scheduleId) {
          socket.join(`schedule-${scheduleId}`);

          if (!this.subscribedSchedules.has(scheduleId)) {
            this.subscribedSchedules.set(scheduleId, new Set());
          }
          this.subscribedSchedules.get(scheduleId).add(socket.id);

          console.log(
            `🚌 Socket ${socket.id} subscribed to schedule: ${scheduleId}`
          );

          socket.emit("schedule-subscribed", {
            scheduleId,
            message: "Successfully subscribed to schedule updates",
          });

          // Send current schedule location
          this.sendCurrentScheduleLocation(socket, scheduleId);
        }
      });

      // Handle unsubscribe from route
      socket.on("unsubscribe-route", (data) => {
        const { routeId } = data;
        if (routeId) {
          socket.leave(`route-${routeId}`);

          if (this.subscribedRoutes.has(routeId)) {
            this.subscribedRoutes.get(routeId).delete(socket.id);
            if (this.subscribedRoutes.get(routeId).size === 0) {
              this.subscribedRoutes.delete(routeId);
            }
          }

          console.log(
            `❌ Socket ${socket.id} unsubscribed from route: ${routeId}`
          );
          socket.emit("route-unsubscribed", { routeId });
        }
      });

      // Handle unsubscribe from schedule
      socket.on("unsubscribe-schedule", (data) => {
        const { scheduleId } = data;
        if (scheduleId) {
          socket.leave(`schedule-${scheduleId}`);

          if (this.subscribedSchedules.has(scheduleId)) {
            this.subscribedSchedules.get(scheduleId).delete(socket.id);
            if (this.subscribedSchedules.get(scheduleId).size === 0) {
              this.subscribedSchedules.delete(scheduleId);
            }
          }

          console.log(
            `❌ Socket ${socket.id} unsubscribed from schedule: ${scheduleId}`
          );
          socket.emit("schedule-unsubscribed", { scheduleId });
        }
      });

      // Handle passenger location sharing (for nearby stops)
      socket.on("update-passenger-location", (data) => {
        const { lat, lng } = data;
        if (lat && lng) {
          const passengerId = this.socketToPassenger.get(socket.id);
          if (passengerId) {
            // Could store passenger location for nearby suggestions
            console.log(
              `📍 Updated location for passenger ${passengerId}: ${lat}, ${lng}`
            );

            // Send nearby stops update
            this.sendNearbyStopsUpdate(socket, lat, lng);
          }
        }
      });

      // Handle disconnection
      socket.on("disconnect", () => {
        console.log(`🔌 Passenger disconnected: ${socket.id}`);

        // Clean up subscriptions
        this.cleanupSocketSubscriptions(socket.id);
        this.socketToPassenger.delete(socket.id);
      });

      // Handle errors
      socket.on("error", (error) => {
        console.error(`❌ Socket error for ${socket.id}:`, error);
      });
    });
  }

  // Send current live buses for a route
  async sendCurrentLiveBuses(socket, routeId) {
    try {
      const schedulesResponse = await apiGateway.getSchedulesFromNDX({
        routeId,
        status: "active",
      });

      if (schedulesResponse.success) {
        const liveBuses = schedulesResponse.data
          .filter((schedule) => schedule.currentLocation)
          .map((schedule) => ({
            scheduleId: schedule._id,
            vehicleNumber: schedule.vehicleNumber,
            position: {
              lat: schedule.currentLocation.coordinates[1],
              lng: schedule.currentLocation.coordinates[0],
            },
            lastUpdate: schedule.lastLocationUpdate,
            heading: schedule.heading || 0,
            speed: schedule.speed || 0,
          }));

        socket.emit("live-buses-update", {
          routeId,
          buses: liveBuses,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error sending live buses:", error);
    }
  }

  // Send current schedule location
  async sendCurrentScheduleLocation(socket, scheduleId) {
    try {
      const scheduleResponse = await apiGateway.getSchedulesFromNDX({
        scheduleId,
      });

      if (scheduleResponse.success && scheduleResponse.data.length > 0) {
        const schedule = scheduleResponse.data[0];

        if (schedule.currentLocation) {
          socket.emit("schedule-location-update", {
            scheduleId: schedule._id,
            vehicleNumber: schedule.vehicleNumber,
            position: {
              lat: schedule.currentLocation.coordinates[1],
              lng: schedule.currentLocation.coordinates[0],
            },
            lastUpdate: schedule.lastLocationUpdate,
            status: schedule.status,
            estimatedArrival: schedule.estimatedArrival,
            timestamp: new Date().toISOString(),
          });
        }
      }
    } catch (error) {
      console.error("Error sending schedule location:", error);
    }
  }

  // Send nearby stops based on passenger location
  async sendNearbyStopsUpdate(socket, lat, lng) {
    try {
      const stopsResponse = await apiGateway.getRoutesFromNDX({
        action: "nearby-stops",
        lat,
        lng,
        radius: 1000,
      });

      if (stopsResponse.success) {
        socket.emit("nearby-stops-update", {
          location: { lat, lng },
          stops: stopsResponse.data,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Error sending nearby stops:", error);
    }
  }

  // Broadcast live location update to subscribed clients
  broadcastLocationUpdate(scheduleId, locationData) {
    if (this.io) {
      this.io.to(`schedule-${scheduleId}`).emit("schedule-location-update", {
        scheduleId,
        ...locationData,
        timestamp: new Date().toISOString(),
      });

      // Also broadcast to route subscribers
      // Note: We'd need routeId from scheduleId lookup
      console.log(`📡 Broadcasted location update for schedule: ${scheduleId}`);
    }
  }

  // Broadcast schedule status update
  broadcastScheduleStatusUpdate(scheduleId, statusData) {
    if (this.io) {
      this.io.to(`schedule-${scheduleId}`).emit("schedule-status-update", {
        scheduleId,
        ...statusData,
        timestamp: new Date().toISOString(),
      });

      console.log(`📡 Broadcasted status update for schedule: ${scheduleId}`);
    }
  }

  // Send notification to specific passenger
  sendNotificationToPassenger(passengerId, notification) {
    if (this.io) {
      this.io.to(`passenger-${passengerId}`).emit("notification", {
        ...notification,
        timestamp: new Date().toISOString(),
        id: Date.now().toString(),
      });

      console.log(
        `📱 Notification sent to passenger ${passengerId}:`,
        notification.title
      );
    }
  }

  // Broadcast system announcement
  broadcastSystemAnnouncement(announcement) {
    if (this.io) {
      this.io.emit("system-announcement", {
        ...announcement,
        timestamp: new Date().toISOString(),
      });

      console.log("📢 System announcement broadcasted:", announcement.title);
    }
  }

  // Send route disruption notification
  broadcastRouteDisruption(routeId, disruptionData) {
    if (this.io) {
      this.io.to(`route-${routeId}`).emit("route-disruption", {
        routeId,
        ...disruptionData,
        timestamp: new Date().toISOString(),
      });

      console.log(`🚧 Route disruption broadcasted for route ${routeId}`);
    }
  }

  // Handle passenger location updates for ETA calculations
  setupPassengerLocationTracking() {
    this.io.on("connection", (socket) => {
      // Passenger location update for ETA
      socket.on("passenger-location-update", async (data) => {
        const { lat, lng, scheduleId } = data;
        const passengerId = this.socketToPassenger.get(socket.id);

        if (passengerId && scheduleId && lat && lng) {
          try {
            const realTimeTrackingService = require("./realTimeTrackingService");
            const eta = await realTimeTrackingService.calculateETA(scheduleId, {
              lat,
              lng,
            });

            if (eta) {
              socket.emit("eta-update", {
                scheduleId,
                ...eta,
                timestamp: new Date().toISOString(),
              });
            }
          } catch (error) {
            console.error("ETA calculation error:", error);
          }
        }
      });

      // Request notification history
      socket.on("get-notification-history", async (data) => {
        const passengerId = this.socketToPassenger.get(socket.id);

        if (passengerId) {
          // Get recent notifications from database/cache
          // This would be implemented based on your notification storage strategy
          socket.emit("notification-history", {
            notifications: [], // Fetch from storage
            timestamp: new Date().toISOString(),
          });
        }
      });

      // Mark notification as read
      socket.on("mark-notification-read", (data) => {
        const { notificationId } = data;
        const passengerId = this.socketToPassenger.get(socket.id);

        if (passengerId && notificationId) {
          // Mark notification as read in storage
          console.log(
            `📱 Notification ${notificationId} marked as read by ${passengerId}`
          );
        }
      });
    });
  }

  // Clean up subscriptions for disconnected socket
  cleanupSocketSubscriptions(socketId) {
    // Clean route subscriptions
    for (const [routeId, socketSet] of this.subscribedRoutes.entries()) {
      socketSet.delete(socketId);
      if (socketSet.size === 0) {
        this.subscribedRoutes.delete(routeId);
      }
    }

    // Clean schedule subscriptions
    for (const [scheduleId, socketSet] of this.subscribedSchedules.entries()) {
      socketSet.delete(socketId);
      if (socketSet.size === 0) {
        this.subscribedSchedules.delete(scheduleId);
      }
    }
  }

  // Periodic location updates from NDX
  startLocationUpdateInterval() {
    setInterval(async () => {
      await this.fetchAndBroadcastLocationUpdates();
    }, 5000); // Update every 5 seconds

    console.log("🔄 Started location update interval (5s)");
  }

  // Fetch latest locations and broadcast to subscribers
  async fetchAndBroadcastLocationUpdates() {
    try {
      // Get all active schedules
      const schedulesResponse = await apiGateway.getSchedulesFromNDX({
        status: "active",
        hasLocation: true,
      });

      if (schedulesResponse.success) {
        for (const schedule of schedulesResponse.data) {
          if (
            schedule.currentLocation &&
            this.subscribedSchedules.has(schedule._id)
          ) {
            this.broadcastLocationUpdate(schedule._id, {
              vehicleNumber: schedule.vehicleNumber,
              position: {
                lat: schedule.currentLocation.coordinates[1],
                lng: schedule.currentLocation.coordinates[0],
              },
              lastUpdate: schedule.lastLocationUpdate,
              heading: schedule.heading || 0,
              speed: schedule.speed || 0,
              status: schedule.status,
            });
          }
        }
      }
    } catch (error) {
      console.error("Error in location update interval:", error);
    }
  }

  // Get connection stats
  getStats() {
    return {
      connectedClients: this.io ? this.io.sockets.sockets.size : 0,
      subscribedRoutes: this.subscribedRoutes.size,
      subscribedSchedules: this.subscribedSchedules.size,
      authenticatedPassengers: this.socketToPassenger.size,
    };
  }
}

module.exports = new SocketService();
