const apiGateway = require("../config/apiGateway");
// Fix: Change from '../models/Passenger' to '../model/Passenger'
const Passenger = require("../model/Passenger");

class ScheduleController {
  // Get all schedules from NDX
  static async getAllSchedules(req, res) {
    try {
      const { status, routeId, date, limit = 50, page = 1 } = req.query;

      // Build query parameters for NDX
      const params = {};
      if (status) params.status = status;
      if (routeId) params.routeId = routeId;
      if (date) params.date = date;
      params.limit = limit;
      params.page = page;

      console.log("📅 Fetching schedules from NDX...", params);

      // Fetch schedules from NDX through API Gateway
      const schedulesResponse = await apiGateway.getSchedulesFromNDX(params);

      if (schedulesResponse.success) {
        const schedules = schedulesResponse.data || [];
        
        // Enhance schedules with passenger-specific information
        const enhancedSchedules = schedules.map(schedule => ({
          ...schedule,
          availableSeats: Math.max(0, (schedule.capacity || 50) - (schedule.currentPassengers || 0)),
          priceEstimate: schedule.routeId?.distance 
            ? Math.round(schedule.routeId.distance * (schedule.routeId.costPerKm || 2.5))
            : 50,
          isBookable: schedule.status === 'active' || schedule.status === 'scheduled'
        }));

        res.json({
          success: true,
          data: enhancedSchedules,
          total: schedulesResponse.total || enhancedSchedules.length,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: schedulesResponse.total || enhancedSchedules.length,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to fetch schedules from NDX",
          error: schedulesResponse.message,
        });
      }
    } catch (error) {
      console.error("Get schedules error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get schedules",
        error: error.message,
      });
    }
  }

  // Get active schedules only
  static async getActiveSchedules(req, res) {
    try {
      const { routeId, limit = 20 } = req.query;

      const params = {
        status: "active,scheduled",
        limit,
        sortBy: "departureTime",
        sortOrder: "asc",
      };
      if (routeId) params.routeId = routeId;

      console.log("🟢 Fetching active schedules from NDX...");

      const schedulesResponse = await apiGateway.getSchedulesFromNDX(params);

      if (schedulesResponse.success) {
        const schedules = schedulesResponse.data || [];
        
        // Filter for truly active schedules (departure time in future)
        const now = new Date();
        const activeSchedules = schedules.filter(schedule => {
          const departureTime = new Date(schedule.departureTime);
          return departureTime > now;
        });

        // Enhance with passenger-specific data
        const enhancedSchedules = activeSchedules.map(schedule => ({
          ...schedule,
          availableSeats: Math.max(0, (schedule.capacity || 50) - (schedule.currentPassengers || 0)),
          timeUntilDeparture: Math.max(0, Math.floor((new Date(schedule.departureTime) - now) / 60000)),
          priceEstimate: schedule.routeId?.distance 
            ? Math.round(schedule.routeId.distance * (schedule.routeId.costPerKm || 2.5))
            : 50
        }));

        res.json({
          success: true,
          data: enhancedSchedules,
          total: enhancedSchedules.length,
          message: `Found ${enhancedSchedules.length} active schedules`,
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to fetch active schedules",
          error: schedulesResponse.message,
        });
      }
    } catch (error) {
      console.error("Get active schedules error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get active schedules",
        error: error.message,
      });
    }
  }

  // Get specific schedule details with route information
  static async getScheduleDetails(req, res) {
    try {
      const { id } = req.params;

      console.log(`📋 Fetching schedule details for: ${id}`);

      const scheduleResponse = await apiGateway.getSchedulesFromNDX({
        scheduleId: id,
      });

      if (scheduleResponse.success && scheduleResponse.data.length > 0) {
        const schedule = scheduleResponse.data[0];
        
        // Get route details if available
        let routeDetails = null;
        if (schedule.routeId) {
          try {
            const routeResponse = await apiGateway.getRoutesFromNDX({
              routeId: schedule.routeId._id || schedule.routeId,
            });
            if (routeResponse.success && routeResponse.data.length > 0) {
              routeDetails = routeResponse.data[0];
            }
          } catch (routeError) {
            console.warn("Failed to fetch route details:", routeError.message);
          }
        }

        const enhancedSchedule = {
          ...schedule,
          route: routeDetails,
          availableSeats: Math.max(0, (schedule.capacity || 50) - (schedule.currentPassengers || 0)),
          priceEstimate: routeDetails?.distance 
            ? Math.round(routeDetails.distance * (routeDetails.costPerKm || 2.5))
            : 50,
          timeUntilDeparture: Math.max(0, Math.floor((new Date(schedule.departureTime) - new Date()) / 60000)),
          isBookable: schedule.status === 'active' || schedule.status === 'scheduled'
        };

        res.json({
          success: true,
          data: enhancedSchedule,
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }
    } catch (error) {
      console.error("Get schedule details error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get schedule details",
        error: error.message,
      });
    }
  }

  // Search schedules by criteria
  static async searchSchedules(req, res) {
    try {
      const { 
        from, 
        to, 
        date, 
        departureAfter, 
        departureBefore, 
        maxPrice,
        minSeats = 1,
        limit = 20 
      } = req.query;

      console.log("🔍 Searching schedules with criteria:", req.query);

      // Build search parameters
      const params = { limit };
      if (date) params.date = date;
      if (departureAfter) params.departureAfter = departureAfter;
      if (departureBefore) params.departureBefore = departureBefore;

      const schedulesResponse = await apiGateway.getSchedulesFromNDX(params);

      if (schedulesResponse.success) {
        let schedules = schedulesResponse.data || [];

        // Filter by location if provided
        if (from || to) {
          schedules = schedules.filter(schedule => {
            const route = schedule.routeId;
            if (!route) return false;

            let matchesFrom = true;
            let matchesTo = true;

            if (from) {
              matchesFrom = route.name?.toLowerCase().includes(from.toLowerCase()) ||
                           route.startLocation?.toLowerCase().includes(from.toLowerCase());
            }

            if (to) {
              matchesTo = route.name?.toLowerCase().includes(to.toLowerCase()) ||
                         route.endLocation?.toLowerCase().includes(to.toLowerCase());
            }

            return matchesFrom && matchesTo;
          });
        }

        // Filter by available seats
        schedules = schedules.filter(schedule => {
          const availableSeats = Math.max(0, (schedule.capacity || 50) - (schedule.currentPassengers || 0));
          return availableSeats >= parseInt(minSeats);
        });

        // Enhance and filter by price if provided
        const enhancedSchedules = schedules.map(schedule => {
          const priceEstimate = schedule.routeId?.distance 
            ? Math.round(schedule.routeId.distance * (schedule.routeId.costPerKm || 2.5))
            : 50;

          return {
            ...schedule,
            availableSeats: Math.max(0, (schedule.capacity || 50) - (schedule.currentPassengers || 0)),
            priceEstimate,
            timeUntilDeparture: Math.max(0, Math.floor((new Date(schedule.departureTime) - new Date()) / 60000))
          };
        }).filter(schedule => {
          return !maxPrice || schedule.priceEstimate <= parseInt(maxPrice);
        });

        res.json({
          success: true,
          data: enhancedSchedules,
          total: enhancedSchedules.length,
          searchCriteria: req.query
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to search schedules",
          error: schedulesResponse.message,
        });
      }
    } catch (error) {
      console.error("Search schedules error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to search schedules",
        error: error.message,
      });
    }
  }

  // Get route path for a specific schedule
  static async getScheduleRoute(req, res) {
    try {
      const { id } = req.params;

      console.log(`🗺️ Fetching route path for schedule: ${id}`);

      // Get schedule details first
      const scheduleResponse = await apiGateway.getSchedulesFromNDX({
        scheduleId: id,
      });

      if (!scheduleResponse.success || scheduleResponse.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      const schedule = scheduleResponse.data[0];
      const routeId = schedule.routeId?._id || schedule.routeId;

      if (!routeId) {
        return res.status(400).json({
          success: false,
          message: "No route associated with this schedule",
        });
      }

      // Get detailed route information
      const routeResponse = await apiGateway.getRoutesFromNDX({
        routeId,
        includeStops: true,
        includePath: true,
      });

      if (routeResponse.success && routeResponse.data.length > 0) {
        const route = routeResponse.data[0];

        res.json({
          success: true,
          data: {
            schedule: {
              id: schedule._id,
              departureTime: schedule.departureTime,
              arrivalTime: schedule.arrivalTime,
              status: schedule.status,
              currentLocation: schedule.currentLocation,
              lastLocationUpdate: schedule.lastLocationUpdate,
            },
            route: {
              id: route._id,
              name: route.name,
              description: route.description,
              stops: route.stops || [],
              path: route.path || { coordinates: [] },
              distance: route.distance,
              estimatedDuration: route.estimatedDuration,
            },
            realTime: {
              isLive: Boolean(
                schedule.currentLocation && schedule.status === "active"
              ),
              lastLocationUpdate: schedule.lastLocationUpdate,
            },
          },
        });
      } else {
        res.status(404).json({
          success: false,
          message: "Route details not found",
        });
      }
    } catch (error) {
      console.error("Get schedule route error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get schedule route",
        error: error.message,
      });
    }
  }
}

module.exports = ScheduleController;
