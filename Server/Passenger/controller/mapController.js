const apiGateway = require("../config/apiGateway");

class MapController {
  // Get route map data for visualization
  static async getRouteMapData(req, res) {
    try {
      const { routeId } = req.params;
      const { includeSchedules = true, includeLiveData = true } = req.query;

      console.log(`🗺️ Fetching map data for route: ${routeId}`);

      // Get route details
      const routeResponse = await apiGateway.getRoutesFromNDX({
        routeId,
        includeStops: true,
        includePath: true,
      });

      if (!routeResponse.success || !routeResponse.data?.[0]) {
        return res.status(404).json({
          success: false,
          message: "Route not found",
        });
      }

      const route = routeResponse.data[0];
      const mapData = {
        route: {
          id: route._id,
          name: route.name,
          description: route.description,
          distance: route.distance,
          estimatedDuration: route.estimatedDuration,
        },
        geometry: {
          type: "Feature",
          properties: {
            name: route.name,
            distance: route.distance,
            duration: route.estimatedDuration,
          },
          geometry: route.path,
        },
        stops:
          route.stops?.map((stop, index) => ({
            id: stop._id,
            name: stop.name,
            position: {
              lat: stop.location.coordinates[1],
              lng: stop.location.coordinates[0],
            },
            coordinates: stop.location.coordinates,
            order: index,
            type:
              index === 0
                ? "start"
                : index === route.stops.length - 1
                ? "end"
                : "intermediate",
          })) || [],
        bounds: calculateRouteBounds(route.stops, route.path),
      };

      // Add schedule data if requested
      if (includeSchedules === "true") {
        try {
          const schedulesResponse = await apiGateway.getSchedulesFromNDX({
            routeId,
            status: "active,scheduled",
            limit: 10,
          });

          if (schedulesResponse.success) {
            mapData.schedules = schedulesResponse.data.map((schedule) => ({
              id: schedule._id,
              departureTime: schedule.departureTime,
              arrivalTime: schedule.arrivalTime,
              status: schedule.status,
              vehicleNumber: schedule.vehicleNumber,
              currentLocation: schedule.currentLocation,
              lastLocationUpdate: schedule.lastLocationUpdate,
              availableSeats:
                schedule.capacity - (schedule.currentPassengers || 0),
            }));
          }
        } catch (scheduleError) {
          console.warn(
            "Could not fetch schedules for map:",
            scheduleError.message
          );
          mapData.schedules = [];
        }
      }

      // Add live bus locations if requested
      if (includeLiveData === "true" && mapData.schedules) {
        mapData.liveBuses = mapData.schedules
          .filter(
            (schedule) =>
              schedule.status === "active" && schedule.currentLocation
          )
          .map((schedule) => ({
            scheduleId: schedule.id,
            vehicleNumber: schedule.vehicleNumber,
            position: {
              lat: schedule.currentLocation.coordinates[1],
              lng: schedule.currentLocation.coordinates[0],
            },
            coordinates: schedule.currentLocation.coordinates,
            lastUpdate: schedule.lastLocationUpdate,
            heading: schedule.heading || 0, // Could be provided by driver app
            speed: schedule.speed || 0,
          }));
      }

      res.json({
        success: true,
        data: mapData,
      });
    } catch (error) {
      console.error("Get route map data error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get route map data",
        error: error.message,
      });
    }
  }

  // Get live bus locations for all active routes
  static async getLiveBusLocations(req, res) {
    try {
      const { bounds, routeIds } = req.query;

      console.log("📍 Fetching live bus locations...");

      // Build query parameters
      const params = { status: "active" };
      if (routeIds) params.routeIds = routeIds;

      // Get active schedules
      const schedulesResponse = await apiGateway.getSchedulesFromNDX(params);

      if (schedulesResponse.success) {
        let liveBuses = schedulesResponse.data
          .filter(
            (schedule) =>
              schedule.currentLocation && schedule.status === "active"
          )
          .map((schedule) => ({
            scheduleId: schedule._id,
            routeId: schedule.routeId?._id || schedule.routeId,
            routeName: schedule.routeId?.name || "Unknown Route",
            vehicleNumber: schedule.vehicleNumber,
            driverName: schedule.driverName,
            position: {
              lat: schedule.currentLocation.coordinates[1],
              lng: schedule.currentLocation.coordinates[0],
            },
            coordinates: schedule.currentLocation.coordinates,
            lastUpdate: schedule.lastLocationUpdate,
            departureTime: schedule.departureTime,
            estimatedArrival: schedule.estimatedArrival,
            currentPassengers: schedule.currentPassengers || 0,
            capacity: schedule.capacity || 50,
            heading: schedule.heading || 0,
            speed: schedule.speed || 0,
            status: schedule.status,
          }));

        // Filter by bounds if provided
        if (bounds) {
          try {
            const [swLat, swLng, neLat, neLng] = bounds.split(",").map(Number);
            liveBuses = liveBuses.filter((bus) => {
              const lat = bus.position.lat;
              const lng = bus.position.lng;
              return (
                lat >= swLat && lat <= neLat && lng >= swLng && lng <= neLng
              );
            });
          } catch (boundsError) {
            console.warn("Invalid bounds format:", boundsError.message);
          }
        }

        res.json({
          success: true,
          data: {
            buses: liveBuses,
            total: liveBuses.length,
            lastUpdate: new Date().toISOString(),
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to fetch live bus locations",
          error: schedulesResponse.message,
        });
      }
    } catch (error) {
      console.error("Get live bus locations error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get live bus locations",
        error: error.message,
      });
    }
  }

  // Find nearby bus stops
  static async findNearbyStops(req, res) {
    try {
      const { lat, lng, radius = 1000 } = req.query;

      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: "Latitude and longitude are required",
        });
      }

      console.log(
        `📍 Finding nearby stops at ${lat}, ${lng} within ${radius}m`
      );

      // Use NDX to find nearby stops
      const stopsResponse = await apiGateway.getRoutesFromNDX({
        action: "nearby-stops",
        lat: parseFloat(lat),
        lng: parseFloat(lng),
        radius: parseInt(radius),
      });

      if (stopsResponse.success) {
        const nearbyStops = stopsResponse.data.map((stop) => ({
          id: stop.id,
          name: stop.name,
          routeId: stop.routeId,
          routeName: stop.routeName,
          position: {
            lat: stop.location.coordinates[1],
            lng: stop.location.coordinates[0],
          },
          coordinates: stop.location.coordinates,
          distance: stop.distance, // Distance in meters
          distanceText:
            stop.distance < 1000
              ? `${Math.round(stop.distance)}m`
              : `${(stop.distance / 1000).toFixed(1)}km`,
          walkingTime: Math.ceil(stop.distance / 80), // Assuming 80m/min walking speed
          hasActiveSchedules: stop.hasActiveSchedules || false,
        }));

        // Sort by distance
        nearbyStops.sort((a, b) => a.distance - b.distance);

        res.json({
          success: true,
          data: {
            stops: nearbyStops,
            searchLocation: { lat: parseFloat(lat), lng: parseFloat(lng) },
            searchRadius: parseInt(radius),
            total: nearbyStops.length,
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Failed to find nearby stops",
          error: stopsResponse.message,
        });
      }
    } catch (error) {
      console.error("Find nearby stops error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to find nearby stops",
        error: error.message,
      });
    }
  }

  // Get route directions between two points
  static async getRouteDirections(req, res) {
    try {
      const { from, to, mode = "transit" } = req.query;

      if (!from || !to) {
        return res.status(400).json({
          success: false,
          message: "From and to coordinates are required (format: lng,lat)",
        });
      }

      console.log(`🧭 Getting directions from ${from} to ${to}`);

      // Use NDX to find routes
      const routesResponse = await apiGateway.getRoutesFromNDX({
        action: "find-routes",
        from,
        to,
      });

      if (routesResponse.success && routesResponse.data.routes) {
        const directions = routesResponse.data.routes.map((routeInfo) => ({
          route: routeInfo.route,
          startStop: routeInfo.startStop,
          endStop: routeInfo.endStop,
          distance: routeInfo.distance,
          duration: routeInfo.duration,
          distanceText: routeInfo.distanceText,
          durationText: routeInfo.durationText,
          walkingDistanceToStart: routeInfo.walkingDistanceToStart,
          walkingDistanceFromEnd: routeInfo.walkingDistanceFromEnd,
          estimatedFare: routeInfo.route.distance
            ? Math.round(
                routeInfo.route.distance * (routeInfo.route.costPerKm || 2.5)
              )
            : 50,
          instructions: [
            {
              type: "walk",
              instruction: `Walk ${Math.round(
                routeInfo.walkingDistanceToStart
              )}m to ${routeInfo.startStop?.name}`,
              distance: routeInfo.walkingDistanceToStart,
              duration: Math.ceil(routeInfo.walkingDistanceToStart / 80), // 80m/min walking
            },
            {
              type: "transit",
              instruction: `Take ${routeInfo.route.name} from ${routeInfo.startStop?.name} to ${routeInfo.endStop?.name}`,
              distance: routeInfo.distance,
              duration: routeInfo.duration / 60, // Convert to minutes
              routeId: routeInfo.route._id,
              routeName: routeInfo.route.name,
            },
            {
              type: "walk",
              instruction: `Walk ${Math.round(
                routeInfo.walkingDistanceFromEnd
              )}m to destination`,
              distance: routeInfo.walkingDistanceFromEnd,
              duration: Math.ceil(routeInfo.walkingDistanceFromEnd / 80),
            },
          ],
        }));

        res.json({
          success: true,
          data: {
            directions,
            searchCriteria: { from, to, mode },
            total: directions.length,
          },
        });
      } else {
        res.status(404).json({
          success: false,
          message: "No routes found between the specified locations",
        });
      }
    } catch (error) {
      console.error("Get route directions error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get route directions",
        error: error.message,
      });
    }
  }
}

// Helper function to calculate route bounds
function calculateRouteBounds(stops, path) {
  let minLat = Infinity,
    maxLat = -Infinity;
  let minLng = Infinity,
    maxLng = -Infinity;

  // Include stops in bounds calculation
  if (stops && stops.length > 0) {
    stops.forEach((stop) => {
      const lat = stop.location.coordinates[1];
      const lng = stop.location.coordinates[0];
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  }

  // Include path coordinates in bounds calculation
  if (path && path.coordinates && path.coordinates.length > 0) {
    path.coordinates.forEach((coord) => {
      const lat = coord[1];
      const lng = coord[0];
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
    });
  }

  // Add some padding
  const latPadding = (maxLat - minLat) * 0.1;
  const lngPadding = (maxLng - minLng) * 0.1;

  return {
    southwest: { lat: minLat - latPadding, lng: minLng - lngPadding },
    northeast: { lat: maxLat + latPadding, lng: maxLng + lngPadding },
  };
}

module.exports = MapController;
