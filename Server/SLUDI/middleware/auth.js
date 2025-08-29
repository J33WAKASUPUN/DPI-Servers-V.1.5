const jwt = require('jsonwebtoken');
const Citizen = require('../models/Citizen');
const Token = require('../models/Token');

// Verify JWT Token
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Access token required'
      });
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.type !== 'access') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    const citizen = await Citizen.findOne({ citizenId: decoded.citizenId });
    
    if (!citizen) {
      return res.status(401).json({
        success: false,
        message: 'Citizen not found'
      });
    }

    if (citizen.status !== 'active') {
      return res.status(401).json({
        success: false,
        message: 'Account is not active'
      });
    }

    req.citizen = citizen;
    req.tokenPayload = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Verify OAuth Token
const verifyOAuthToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'OAuth token required'
      });
    }

    const tokenValue = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    const token = await Token.findOne({ 
      token: tokenValue, 
      tokenType: 'oauth' 
    });

    if (!token || !token.isValid()) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OAuth token'
      });
    }

    const citizen = await Citizen.findOne({ citizenId: token.citizenId });
    
    if (!citizen) {
      return res.status(401).json({
        success: false,
        message: 'Citizen not found'
      });
    }

    req.citizen = citizen;
    req.oauthToken = token;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'OAuth token verification failed'
    });
  }
};

// Admin only middleware
const requireAdmin = (req, res, next) => {
  if (req.citizen.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

// Rate limiting middleware
const rateLimiter = (maxRequests = 5, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;

    if (!requests.has(ip)) {
      requests.set(ip, []);
    }

    const requestTimes = requests.get(ip).filter(time => time > windowStart);
    
    if (requestTimes.length >= maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests, please try again later'
      });
    }

    requestTimes.push(now);
    requests.set(ip, requestTimes);
    next();
  };
};

module.exports = {
  verifyToken,
  verifyOAuthToken,
  requireAdmin,
  rateLimiter
};