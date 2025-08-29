const axios = require('axios');
const { calculateDistanceAndTime } = require('./gpsUtils');

// Load Google Maps API key from environment variables
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

/**
 * Geocode an address to coordinates
 * @param {String} address - Address to geocode
 * @returns {Promise<Object>} Object containing location data
 */
exports.geocodeAddress = async (address) => {
  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: {
        address,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Geocoding failed: ${response.data.status}`);
    }

    const result = response.data.results[0];
    return {
      address: result.formatted_address,
      location: {
        type: 'Point',
        coordinates: [
          result.geometry.location.lng, 
          result.geometry.location.lat
        ]
      }
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw error;
  }
};

/**
 * Get distance and duration between two points using Google Distance Matrix API
 * @param {Array} origin - [longitude, latitude] coordinates of origin
 * @param {Array} destination - [longitude, latitude] coordinates of destination
 * @param {String} mode - Travel mode (driving, walking, bicycling, transit)
 * @returns {Promise<Object>} Object containing distance and duration
 */
exports.getRouteDetails = async (origin, destination, mode = 'driving') => {
  try {
    // Format coordinates for Google API (lat,lng format)
    const originStr = `${origin[1]},${origin[0]}`;
    const destinationStr = `${destination[1]},${destination[0]}`;

    const response = await axios.get('https://maps.googleapis.com/maps/api/distancematrix/json', {
      params: {
        origins: originStr,
        destinations: destinationStr,
        mode,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Distance Matrix API failed: ${response.data.status}`);
    }

    const result = response.data.rows[0].elements[0];
    if (result.status !== 'OK') {
      throw new Error(`Route calculation failed: ${result.status}`);
    }

    return {
      distance: result.distance.value, // in meters
      duration: result.duration.value, // in seconds
      distanceText: result.distance.text,
      durationText: result.duration.text
    };
  } catch (error) {
    console.error('Distance Matrix API error:', error);
    // Fall back to Haversine formula if API fails
    const { distance, estimatedTime } = calculateDistanceAndTime(origin, destination);
    return {
      distance,
      duration: estimatedTime,
      distanceText: `${Math.round(distance / 100) / 10} km`,
      durationText: `${Math.round(estimatedTime / 60)} mins`
    };
  }
};

/**
 * Get directions between two points with optional waypoints
 * @param {Array} origin - [longitude, latitude] coordinates of origin
 * @param {Array} destination - [longitude, latitude] coordinates of destination
 * @param {Array} waypoints - Array of [longitude, latitude] waypoints
 * @param {String} mode - Travel mode (driving, walking, bicycling, transit)
 * @returns {Promise<Object>} Object containing route data
 */
exports.getDirections = async (origin, destination, waypoints = [], mode = 'driving') => {
  try {
    // Format coordinates for Google API (lat,lng format)
    const originStr = `${origin[1]},${origin[0]}`;
    const destinationStr = `${destination[1]},${destination[0]}`;
    
    // Format waypoints
    const waypointsStr = waypoints.map(wp => `${wp[1]},${wp[0]}`).join('|');
    
    const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
      params: {
        origin: originStr,
        destination: destinationStr,
        waypoints: waypointsStr ? `optimize:true|${waypointsStr}` : '',
        mode,
        key: GOOGLE_MAPS_API_KEY
      }
    });

    if (response.data.status !== 'OK') {
      throw new Error(`Directions API failed: ${response.data.status}`);
    }

    const route = response.data.routes[0];
    
    // Extract the polyline path
    const path = {
      type: 'LineString',
      coordinates: decodePath(route.overview_polyline.points)
    };
    
    // Extract legs information
    const legs = route.legs.map(leg => ({
      distance: leg.distance.value,
      duration: leg.duration.value,
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      startLocation: [leg.start_location.lng, leg.start_location.lat],
      endLocation: [leg.end_location.lng, leg.end_location.lat]
    }));

    return {
      path,
      legs,
      distance: route.legs.reduce((sum, leg) => sum + leg.distance.value, 0),
      duration: route.legs.reduce((sum, leg) => sum + leg.duration.value, 0),
      waypointOrder: response.data.routes[0].waypoint_order
    };
  } catch (error) {
    console.error('Directions API error:', error);
    throw error;
  }
};

/**
 * Estimate time of arrival (ETA) for a vehicle to reach specific stops
 * @param {Array} vehicleLocation - [longitude, latitude] coordinates of vehicle
 * @param {Array} stops - Array of stop objects with locations
 * @param {String} mode - Travel mode (driving, walking, bicycling, transit)
 * @returns {Promise<Array>} Array of stops with estimated arrival times
 */
exports.calculateETA = async (vehicleLocation, stops, mode = 'driving') => {
  try {
    const results = [];
    
    for (const stop of stops) {
      // Get route details from vehicle to stop
      const routeDetails = await exports.getRouteDetails(
        vehicleLocation,
        stop.location.coordinates,
        mode
      );
      
      // Calculate ETA
      const now = new Date();
      const eta = new Date(now.getTime() + routeDetails.duration * 1000);
      
      results.push({
        stopId: stop._id,
        stopName: stop.name,
        distance: routeDetails.distance,
        duration: routeDetails.duration,
        eta
      });
    }
    
    return results;
  } catch (error) {
    console.error('ETA calculation error:', error);
    throw error;
  }
};

/**
 * Optimize route by reordering waypoints for shortest path
 * @param {Array} origin - [longitude, latitude] coordinates of origin
 * @param {Array} destination - [longitude, latitude] coordinates of destination
 * @param {Array} waypoints - Array of [longitude, latitude] waypoints
 * @returns {Promise<Object>} Object containing optimized route data
 */
exports.optimizeRoute = async (origin, destination, waypoints) => {
  try {
    const directions = await exports.getDirections(origin, destination, waypoints, 'driving');
    
    // Reorder waypoints based on the optimized order
    const optimizedWaypoints = directions.waypointOrder.map(index => waypoints[index]);
    
    return {
      optimizedWaypoints,
      path: directions.path,
      distance: directions.distance,
      duration: directions.duration
    };
  } catch (error) {
    console.error('Route optimization error:', error);
    throw error;
  }
};

/**
 * Decode Google's encoded polyline format to coordinates
 * @param {String} encoded - Encoded polyline string
 * @returns {Array} Array of [longitude, latitude] coordinates
 */
function decodePath(encoded) {
  const points = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b;
    let shift = 0;
    let result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlat = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    const dlng = ((result & 1) !== 0 ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    // Note: Google's coordinates are in lat,lng format, we convert to lng,lat for GeoJSON
    points.push([lng * 1e-5, lat * 1e-5]);
  }

  return points;
}