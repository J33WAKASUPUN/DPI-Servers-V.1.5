const jwt = require('jsonwebtoken');
const Driver = require('../models/Driver');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const driver = await Driver.findById(decoded.id);
    if (!driver) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token - driver not found'
      });
    }

    if (driver.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account suspended'
      });
    }

    req.driver = driver;
    next();
  } catch (error) {
    console.error('Token verification error:', error);

    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token verification failed'
    });
  }
};

// Check if driver is verified
const requireVerification = (req, res, next) => {
  // Bypass verification in development mode
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_DRIVER_VERIFICATION === 'true') {
    console.log('⚠️ Driver verification bypassed for development');
    return next();
  }

  if (!req.driver.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Driver verification required',
      code: 'DRIVER_NOT_VERIFIED',
      details: {
        driverId: req.driver._id,
        isVerified: req.driver.isVerified,
        status: req.driver.status
      }
    });
  }
  next();
};

// Check driver status
const requireActiveStatus = (req, res, next) => {
  if (req.driver.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Driver account is not active'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireVerification,
  requireActiveStatus
};