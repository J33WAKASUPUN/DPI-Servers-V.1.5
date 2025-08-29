const jwt = require('jsonwebtoken');

// Verify JWT Token
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

    try {
      // Verify the JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.type === 'access' && decoded.citizenId) {
        req.citizen = { 
          citizenId: decoded.citizenId,
          email: decoded.email,
          role: decoded.role
        };
        console.log('✅ PayDPI: Authenticated user:', decoded.citizenId);
      } else {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format'
        });
      }
      
      next();
    } catch (jwtError) {
      console.log('❌ PayDPI: JWT verification failed:', jwtError.message);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

  } catch (error) {
    console.error('PayDPI Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed'
    });
  }
};

// Role-based authorization
const authorize = (roles = []) => {
  return (req, res, next) => {
    if (roles.length === 0) return next();
    
    const userRole = req.citizen?.role || 'citizen';
    
    if (roles.includes(userRole)) {
      next();
    } else {
      res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
  };
};

module.exports = {
  verifyToken,
  authorize
};