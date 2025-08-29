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
    return /^[0-9]{10}$/.test(value);
  },
  
  isLicenseNumber: (value) => {
    // Sri Lankan license number format
    return /^[A-Z0-9]{5,20}$/.test(value);
  },
  
  isVehicleNumber: (value) => {
    // Sri Lankan vehicle number format
    return /^[A-Z]{2,3}-[0-9]{4}$/.test(value) || /^[A-Z0-9]{5,10}$/.test(value);
  },
  
  isValidCoordinate: (lat, lng) => {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
};

module.exports = {
  handleValidationErrors,
  customValidators
};