/**
 * Data validation utilities for NDX server
 */

class DataValidator {
  // Validate coordinates
  static isValidCoordinates(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return false;
    }
    
    const [lng, lat] = coordinates;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  // Validate route data
  static validateRoute(routeData) {
    const errors = [];
    
    if (!routeData.name || routeData.name.trim().length === 0) {
      errors.push('Route name is required');
    }
    
    if (!routeData.stops || routeData.stops.length < 2) {
      errors.push('Route must have at least 2 stops');
    }
    
    if (routeData.stops) {
      routeData.stops.forEach((stop, index) => {
        if (!stop.name) {
          errors.push(`Stop ${index + 1} name is required`);
        }
        
        if (!stop.location || !this.isValidCoordinates(stop.location.coordinates)) {
          errors.push(`Stop ${index + 1} has invalid coordinates`);
        }
      });
    }
    
    if (routeData.path && !this.isValidCoordinates(routeData.path.coordinates[0])) {
      errors.push('Route path has invalid coordinates');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate journey data
  static validateJourney(journeyData) {
    const errors = [];
    
    if (!journeyData.scheduleId) {
      errors.push('Schedule ID is required');
    }
    
    if (!journeyData.passengerId) {
      errors.push('Passenger ID is required');
    }
    
    if (!journeyData.startTime) {
      errors.push('Start time is required');
    }
    
    if (journeyData.fare && journeyData.fare < 0) {
      errors.push('Fare must be positive');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Validate schedule data
  static validateSchedule(scheduleData) {
    const errors = [];
    
    if (!scheduleData.routeId) {
      errors.push('Route ID is required');
    }
    
    if (!scheduleData.driverId) {
      errors.push('Driver ID is required');
    }
    
    if (!scheduleData.vehicleNumber) {
      errors.push('Vehicle number is required');
    }
    
    if (!scheduleData.departureTime) {
      errors.push('Departure time is required');
    }
    
    if (!scheduleData.arrivalTime) {
      errors.push('Arrival time is required');
    }
    
    if (scheduleData.departureTime && scheduleData.arrivalTime) {
      if (new Date(scheduleData.arrivalTime) <= new Date(scheduleData.departureTime)) {
        errors.push('Arrival time must be after departure time');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Sanitize input data
  static sanitizeString(str) {
    if (typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, '');
  }

  // Validate and sanitize location search query
  static validateLocationQuery(query) {
    if (!query || typeof query !== 'string') {
      return { isValid: false, error: 'Search query is required' };
    }
    
    const sanitized = this.sanitizeString(query);
    if (sanitized.length < 2) {
      return { isValid: false, error: 'Search query must be at least 2 characters' };
    }
    
    return { isValid: true, sanitized };
  }
}

module.exports = DataValidator;