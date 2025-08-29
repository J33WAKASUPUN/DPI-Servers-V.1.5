const { validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

// Generate JWT token
const generateToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d'
  });
};

// Register driver
exports.register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      licenseNumber,
      licenseExpiry,
      vehicleNumber,
      vehicleType
    } = req.body;

    // Check if driver already exists
    const existingDriver = await Driver.findOne({
      $or: [
        { email },
        { licenseNumber },
        { vehicleNumber }
      ]
    });

    if (existingDriver) {
      let field = 'email';
      if (existingDriver.licenseNumber === licenseNumber) field = 'license number';
      if (existingDriver.vehicleNumber === vehicleNumber) field = 'vehicle number';
      
      return res.status(400).json({
        success: false,
        message: `Driver with this ${field} already exists`
      });
    }

    // Create new driver
    const driver = new Driver({
      firstName,
      lastName,
      email,
      phone,
      password,
      licenseNumber,
      licenseExpiry: new Date(licenseExpiry),
      vehicleNumber,
      vehicleType
    });

    await driver.save();

    // Generate tokens
    const accessToken = generateToken({ id: driver._id, email: driver.email });
    const refreshToken = generateRefreshToken({ id: driver._id, email: driver.email });

    // Save refresh token
    driver.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });
    await driver.save();

    res.status(201).json({
      success: true,
      message: 'Driver registered successfully',
      data: {
        driver: {
          id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          email: driver.email,
          phone: driver.phone,
          licenseNumber: driver.licenseNumber,
          vehicleNumber: driver.vehicleNumber,
          vehicleType: driver.vehicleType,
          status: driver.status,
          isVerified: driver.isVerified
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login driver
exports.login = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find driver and include password
    const driver = await Driver.findOne({ email }).select('+password');
    
    if (!driver || !(await driver.comparePassword(password))) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check if account is suspended
    if (driver.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      });
    }

    // Generate tokens
    const accessToken = generateToken({ id: driver._id, email: driver.email });
    const refreshToken = generateRefreshToken({ id: driver._id, email: driver.email });

    // Save refresh token
    driver.refreshTokens.push({
      token: refreshToken,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    });

    // Update last active and online status
    driver.lastActive = new Date();
    driver.isOnline = true;
    await driver.save();

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        driver: {
          id: driver._id,
          firstName: driver.firstName,
          lastName: driver.lastName,
          email: driver.email,
          phone: driver.phone,
          licenseNumber: driver.licenseNumber,
          vehicleNumber: driver.vehicleNumber,
          vehicleType: driver.vehicleType,
          status: driver.status,
          isVerified: driver.isVerified,
          currentJourney: driver.currentJourney
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Logout driver
exports.logout = async (req, res) => {
  try {
    // Implementation will be added with middleware
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};

// Refresh token
exports.refreshToken = async (req, res) => {
  try {
    // Implementation will be added with middleware
    res.json({
      success: true,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
};