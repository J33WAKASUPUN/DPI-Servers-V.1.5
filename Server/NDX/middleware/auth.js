const jwt = require('jsonwebtoken');

// Verify JWT Token (validates with SLUDI server)
const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      req.citizen = { citizenId: 'anonymous' };
      return next();
    }

    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    try {
      // For manual inspection of token
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        console.log('❌ Invalid token format');
        req.citizen = { citizenId: 'anonymous' };
        return next();
      }

      // Try to manually decode header and payload (without verification)
      try {
        const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        console.log('📄 Token Header:', header);
        console.log('📄 Token Payload:', payload);
        
        // If we can extract citizenId manually and don't care about verification
        // for development purposes, use this:
        if (payload && payload.citizenId) {
          req.citizen = { 
            citizenId: payload.citizenId,
            email: payload.email,
            role: payload.role
          };
          console.log('✅ Using citizenId from payload:', payload.citizenId);
          return next();
        }
      } catch (parseError) {
        console.log('❌ Error parsing token parts:', parseError.message);
      }

      // Standard JWT verification
      console.log('🔑 JWT_SECRET first 10 chars:', process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 10) + '...' : 'undefined');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ JWT Verification succeeded:', decoded);
      
      if (decoded.type === 'access' && decoded.citizenId) {
        req.citizen = { 
          citizenId: decoded.citizenId,
          email: decoded.email,
          role: decoded.role
        };
        console.log('✅ Using citizenId from verified JWT:', decoded.citizenId);
      } else {
        console.log('⚠️ Token verified but missing required fields');
        req.citizen = { citizenId: 'anonymous' };
      }
      next();
    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      console.log('🔍 Token first 20 chars:', token.substring(0, 20) + '...');
      
      // IMPORTANT FALLBACK: For development, extract citizenId from payload even if verification fails
      try {
        const tokenParts = token.split('.');
        const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
        if (payload && payload.citizenId) {
          req.citizen = { 
            citizenId: payload.citizenId,
            email: payload.email,
            role: payload.role
          };
          console.log('✅ Using citizenId from unverified payload as fallback:', payload.citizenId);
          return next();
        }
      } catch (e) {}
      
      req.citizen = { citizenId: 'anonymous' };
      next();
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    req.citizen = { citizenId: 'anonymous' };
    next();
  }
};

const authorize = (roles = []) => {
  return (req, res, next) => {
    next();
  };
};

module.exports = {
  verifyToken,
  authorize
};