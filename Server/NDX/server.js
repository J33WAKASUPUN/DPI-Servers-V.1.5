const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/database');
const routeRoutes = require('./routes/route.routes');
const journeyRoutes = require('./routes/journey.routes');
const scheduleRoutes = require('./routes/schedule.routes');

const app = express();
const PORT = process.env.PORT || 3002;

// Connect to database
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'NDX Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public API Routes (No authentication required for basic functionality)
app.use('/api/routes', routeRoutes);
app.use('/api/journeys', journeyRoutes);
app.use('/api/schedules', scheduleRoutes);

// Debug routes
app.get('/api/debug/token', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(400).json({
      success: false,
      message: 'No token provided'
    });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader;
  
  try {
    // Manual token inspection
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // Decode without verification
    const header = JSON.parse(Buffer.from(tokenParts[0], 'base64').toString());
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    
    // Try to verify
    let verified = false;
    let verifyError = null;
    try {
      jwt.verify(token, process.env.JWT_SECRET);
      verified = true;
    } catch (err) {
      verifyError = err.message;
    }

    res.json({
      success: true,
      token: {
        format: 'valid',
        header,
        payload,
        verification: {
          success: verified,
          error: verifyError
        },
        citizenId: payload.citizenId || 'not found',
        env: {
          nodeEnv: process.env.NODE_ENV,
          jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
          jwtSecretStart: process.env.JWT_SECRET ? process.env.JWT_SECRET.substring(0, 5) + '...' : 'undefined'
        }
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error analyzing token',
      error: error.message
    });
  }
});

// Add to server.js - FOR DEVELOPMENT ONLY!
app.get('/api/debug/generate-token', (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({
      success: false,
      message: 'Not available in production'
    });
  }

  const jwt = require('jsonwebtoken');
  const testPayload = {
    citizenId: 'TEST_USER_ID_123',
    email: 'test@example.com',
    role: 'citizen',
    type: 'access'
  };

  const token = jwt.sign(testPayload, process.env.JWT_SECRET, {
    expiresIn: '1h',
    issuer: 'SLUDI',
    audience: 'DPI-ECOSYSTEM'
  });

  res.json({
    success: true,
    message: 'Test token generated',
    token,
    jwtSecret: process.env.JWT_SECRET.substring(0, 5) + '...' + process.env.JWT_SECRET.slice(-5)
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 NDX Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🛣️  Routes API: http://localhost:${PORT}/api/routes`);
  console.log(`🚌 Journey API: http://localhost:${PORT}/api/journeys`);
  console.log(`📅 Schedule API: http://localhost:${PORT}/api/schedules`);
});

module.exports = app;