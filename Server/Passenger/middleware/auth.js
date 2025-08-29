const jwt = require('jsonwebtoken');
const Passenger = require('../model/Passenger');
const apiGateway = require('../config/apiGateway');

// Verify JWT token and authenticate passenger
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

    // Always try to decode the token locally first
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      console.log(`🔍 Token decoded successfully:`, {
        type: decoded.type,
        passengerId: decoded.passengerId,
        email: decoded.email
      });

      // Handle temporary tokens (for unverified passengers)
      if (decoded.type === 'temp_access') {
        const passenger = await Passenger.findById(decoded.passengerId).select('+tempPassword');
        
        if (!passenger) {
          return res.status(401).json({
            success: false,
            message: 'Passenger not found'
          });
        }

        // Check if passenger still exists and email matches
        if (passenger.email !== decoded.email) {
          return res.status(401).json({
            success: false,
            message: 'Token mismatch'
          });
        }

        req.passenger = passenger;
        req.token = token;
        req.tokenType = 'temporary';
        console.log(`🔓 Temporary token verified for: ${passenger.email}`);
        return next();
      }

      // Handle regular JWT tokens (could be from SLUDI or local)
      if (decoded.passengerId) {
        // This is a local token with passengerId
        const passenger = await Passenger.findById(decoded.passengerId);
        
        if (!passenger) {
          return res.status(401).json({
            success: false,
            message: 'Passenger not found'
          });
        }
        
        req.passenger = passenger;
        req.token = token;
        req.tokenType = 'local';
        console.log(`🔓 Local token verified for: ${passenger.email}`);
        return next();
      }

      // Handle SLUDI tokens (for verified passengers)
      if (decoded.citizenId && !decoded.passengerId) {
        // This is a SLUDI token, find passenger by citizenId
        const passenger = await Passenger.findOne({ citizenId: decoded.citizenId });
        
        if (!passenger) {
          return res.status(401).json({
            success: false,
            message: 'Passenger record not found'
          });
        }
        
        req.passenger = passenger;
        req.token = token;
        req.tokenType = 'sludi';
        console.log(`🔓 SLUDI token verified for: ${passenger.email}`);
        return next();
      }

    } catch (jwtError) {
      console.log('JWT verification failed, trying SLUDI authentication...');
      
      // Only try SLUDI if the token doesn't look like our temporary token
      if (!token.includes('temp_access')) {
        try {
          const sludiResponse = await apiGateway.authenticateWithSLUDI(token);
          
          if (sludiResponse.success && sludiResponse.data.citizen) {
            const citizenData = sludiResponse.data.citizen;
            
            // Find passenger record
            let passenger = await Passenger.findOne({ citizenId: citizenData.citizenId });
            
            if (!passenger) {
              return res.status(401).json({
                success: false,
                message: 'Passenger record not found'
              });
            }
            
            req.passenger = passenger;
            req.token = token;
            req.tokenType = 'sludi';
            console.log(`🔓 SLUDI authentication successful for: ${passenger.email}`);
            return next();
          }
        } catch (sludiError) {
          console.error('SLUDI authentication error:', sludiError.message);
        }
      }
      
      return res.status(401).json({
        success: false,
        message: 'Authentication failed'
      });
    }

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication service error'
    });
  }
};

// Check if passenger account is active (modified to allow pending verification)
const requireActiveAccount = (req, res, next) => {
  if (req.passenger.status === 'suspended') {
    return res.status(403).json({
      success: false,
      message: 'Account is suspended. Please contact support.'
    });
  }
  next();
};

// Check if passenger is verified (for features requiring verification)
const requireVerification = (req, res, next) => {
  if (!req.passenger.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Account verification required. Please verify your Citizen ID.',
      requiresCitizenVerification: true
    });
  }
  next();
};

module.exports = {
  verifyToken,
  requireActiveAccount,
  requireVerification
};