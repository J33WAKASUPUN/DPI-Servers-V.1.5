const { validationResult } = require('express-validator');

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation errors',
      errors: errors.array()
    });
  }
  
  next();
};

// Custom validators
const customValidators = {
  isPhoneNumber: (value) => {
    return /^[0-9+\-\s()]{10,15}$/.test(value);
  },
  
  isCitizenId: (value) => {
    return /^SL[0-9]{10,15}$/.test(value);
  },
  
  isValidCoordinate: (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },

  isValidEmail: (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
};

module.exports = {
  handleValidationErrors,
  customValidators
};