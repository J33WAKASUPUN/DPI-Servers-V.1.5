/**
 * GPS and location utility functions using Haversine formula
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {Array} coord1 - [longitude, latitude] of first point
 * @param {Array} coord2 - [longitude, latitude] of second point
 * @returns {Number} Distance in meters
 */
function calculateDistance(coord1, coord2) {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (coord1[1] * Math.PI) / 180;
  const lat2Rad = (coord2[1] * Math.PI) / 180;
  const deltaLatRad = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const deltaLngRad = ((coord2[0] - coord1[0]) * Math.PI) / 180;

  const a = Math.sin(deltaLatRad / 2) * Math.sin(deltaLatRad / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) *
    Math.sin(deltaLngRad / 2) * Math.sin(deltaLngRad / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate distance and estimated time between two coordinates
 * @param {Array} origin - [longitude, latitude] of origin
 * @param {Array} destination - [longitude, latitude] of destination
 * @param {Number} avgSpeed - Average speed in km/h (default: 40 km/h for city driving)
 * @returns {Object} Object containing distance and estimated time
 */
function calculateDistanceAndTime(origin, destination, avgSpeed = 40) {
  const distance = calculateDistance(origin, destination);
  const estimatedTime = (distance / 1000) / avgSpeed * 3600; // Convert to seconds
  
  return {
    distance, // in meters
    estimatedTime: Math.round(estimatedTime) // in seconds
  };
}

/**
 * Check if a point is within a certain radius of another point
 * @param {Array} center - [longitude, latitude] of center point
 * @param {Array} point - [longitude, latitude] of point to check
 * @param {Number} radius - Radius in meters
 * @returns {Boolean} True if point is within radius
 */
function isWithinRadius(center, point, radius) {
  const distance = calculateDistance(center, point);
  return distance <= radius;
}

/**
 * Find the closest point from an array of points
 * @param {Array} origin - [longitude, latitude] of origin
 * @param {Array} points - Array of [longitude, latitude] coordinates
 * @returns {Object} Object containing closest point and distance
 */
function findClosestPoint(origin, points) {
  let closestPoint = null;
  let shortestDistance = Infinity;
  let closestIndex = -1;

  points.forEach((point, index) => {
    const distance = calculateDistance(origin, point);
    if (distance < shortestDistance) {
      shortestDistance = distance;
      closestPoint = point;
      closestIndex = index;
    }
  });

  return {
    point: closestPoint,
    distance: shortestDistance,
    index: closestIndex
  };
}

module.exports = {
  calculateDistance,
  calculateDistanceAndTime,
  isWithinRadius,
  findClosestPoint
};