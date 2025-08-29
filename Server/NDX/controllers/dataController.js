const Route = require('../models/Route');
const Journey = require('../models/Journey');
const { geocodeAddress, getRouteDetails } = require('../utils/mapsUtils');
const { calculateDistance } = require('../utils/gpsUtils');

class DataController {
  // Search locations using geocoding
  static async searchLocations(req, res) {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
      }

      const locationData = await geocodeAddress(query);
      
      res.json({
        success: true,
        data: locationData
      });

    } catch (error) {
      console.error('Location search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search locations',
        error: error.message
      });
    }
  }

  // Find routes between two locations
  static async findRoutes(req, res) {
    try {
      const { from, to } = req.query;
      
      if (!from || !to) {
        return res.status(400).json({
          success: false,
          message: 'From and to coordinates are required'
        });
      }

      // Parse coordinates
      const fromCoords = from.split(',').map(Number);
      const toCoords = to.split(',').map(Number);

      // Validate coordinates
      if (fromCoords.length !== 2 || toCoords.length !== 2 || 
          fromCoords.some(isNaN) || toCoords.some(isNaN)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid coordinate format. Use: longitude,latitude'
        });
      }

      // First, find routes near the starting point
      const routesNearStart = await Route.find({
        'stops.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: fromCoords
            },
            $maxDistance: 5000 // 5km radius
          }
        }
      }).populate('schedules');

      // Then filter those routes to see which ones also pass near the destination
      const validRoutes = [];
      
      for (const route of routesNearStart) {
        // Check if this route has a stop near the destination
        const hasDestinationStop = route.stops.some(stop => {
          const distance = calculateDistance(toCoords, stop.location.coordinates);
          return distance <= 5000; // 5km radius
        });
        
        if (hasDestinationStop) {
          validRoutes.push(route);
        }
      }

      // If no routes found with the stops approach, try path-based search
      if (validRoutes.length === 0) {
        console.log('No routes found with stops, trying path-based search...');
        
        const routesNearStartPath = await Route.find({
          'path': {
            $near: {
              $geometry: {
                type: 'Point',
                coordinates: fromCoords
              },
              $maxDistance: 5000
            }
          }
        }).populate('schedules');

        for (const route of routesNearStartPath) {
          // Check if route path passes near destination
          if (route.path && route.path.coordinates) {
            const pathPassesDestination = route.path.coordinates.some(coord => {
              const distance = calculateDistance(toCoords, coord);
              return distance <= 5000;
            });
            
            if (pathPassesDestination) {
              validRoutes.push(route);
            }
          }
        }
      }

      // Calculate route details for each found route
      const routeDetails = await Promise.all(
        validRoutes.map(async (route) => {
          try {
            const details = await getRouteDetails(fromCoords, toCoords);
            
            // Find the closest stops to start and end points
            let startStop = null;
            let endStop = null;
            let minStartDistance = Infinity;
            let minEndDistance = Infinity;
            
            route.stops.forEach(stop => {
              const startDistance = calculateDistance(fromCoords, stop.location.coordinates);
              const endDistance = calculateDistance(toCoords, stop.location.coordinates);
              
              if (startDistance < minStartDistance) {
                minStartDistance = startDistance;
                startStop = stop;
              }
              
              if (endDistance < minEndDistance) {
                minEndDistance = endDistance;
                endStop = stop;
              }
            });
            
            return {
              route: {
                _id: route._id,
                name: route.name,
                description: route.description,
                distance: route.distance,
                estimatedDuration: route.estimatedDuration,
                costPerKm: route.costPerKm
              },
              startStop,
              endStop,
              distance: details.distance,
              duration: details.duration,
              distanceText: details.distanceText,
              durationText: details.durationText,
              walkingDistanceToStart: Math.round(minStartDistance),
              walkingDistanceFromEnd: Math.round(minEndDistance)
            };
          } catch (error) {
            console.error('Error calculating route details:', error);
            // Return basic info if API call fails
            return {
              route: {
                _id: route._id,
                name: route.name,
                description: route.description,
                distance: route.distance,
                estimatedDuration: route.estimatedDuration,
                costPerKm: route.costPerKm
              },
              distance: route.distance * 1000, // Convert km to meters
              duration: route.estimatedDuration * 60, // Convert minutes to seconds
              distanceText: `${route.distance} km`,
              durationText: `${route.estimatedDuration} mins`,
              error: 'Route details calculation failed'
            };
          }
        })
      );

      res.json({
        success: true,
        data: {
          routes: routeDetails,
          searchCriteria: {
            from: fromCoords,
            to: toCoords,
            searchRadius: '5km'
          },
          totalRoutes: routeDetails.length
        }
      });

    } catch (error) {
      console.error('Route search error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to find routes',
        error: error.message
      });
    }
  }

  // Get nearby stops
  static async getNearbyStops(req, res) {
    try {
      const { lat, lng, radius = 1000 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Latitude and longitude are required'
        });
      }

      const coordinates = [parseFloat(lng), parseFloat(lat)];
      
      const routes = await Route.find({
        'stops.location': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: parseInt(radius)
          }
        }
      });

      // Extract nearby stops
      const nearbyStops = [];
      routes.forEach(route => {
        route.stops.forEach(stop => {
          const distance = calculateDistance(coordinates, stop.location.coordinates);
          if (distance <= radius) {
            nearbyStops.push({
              routeId: route._id,
              routeName: route.name,
              stop: stop,
              distance: Math.round(distance)
            });
          }
        });
      });

      res.json({
        success: true,
        data: nearbyStops
      });

    } catch (error) {
      console.error('Nearby stops error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get nearby stops',
        error: error.message
      });
    }
  }

  // Get route details
  static async getRouteDetails(req, res) {
    try {
      const { routeId } = req.params;
      
      const route = await Route.findById(routeId).populate('schedules');
      
      if (!route) {
        return res.status(404).json({
          success: false,
          message: 'Route not found'
        });
      }

      res.json({
        success: true,
        data: route
      });

    } catch (error) {
      console.error('Get route details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get route details',
        error: error.message
      });
    }
  }

  // Get journey history for a passenger
  static async getJourneyHistory(req, res) {
    try {
      const citizenId = req.citizen.citizenId;
      
      const journeys = await Journey.find({ 
        passengerId: citizenId 
      }).sort({ createdAt: -1 }).limit(50);

      res.json({
        success: true,
        data: journeys
      });

    } catch (error) {
      console.error('Journey history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get journey history',
        error: error.message
      });
    }
  }
}

module.exports = DataController;