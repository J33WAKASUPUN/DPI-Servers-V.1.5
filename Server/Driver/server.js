const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');

// Import routes
const authRoutes = require('./routes/auth');
const driverRoutes = require('./routes/driver');
const scheduleRoutes = require('./routes/schedule');
const trackingRoutes = require('./routes/tracking');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://192.168.43.187:3000',
    'http://localhost:3006',
    'http://192.168.43.187:3006'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

if (process.env.NODE_ENV === 'production') {
  app.use(limiter);
}

// Middleware
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health Check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Driver API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/tracking', trackingRoutes);

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Driver API Documentation',
    version: '1.0.0',
    baseUrl: `http://localhost:${PORT}`,
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register new driver',
        'POST /api/auth/login': 'Driver login',
        'POST /api/auth/logout': 'Driver logout',
        'POST /api/auth/refresh': 'Refresh access token',
        'GET /api/auth/profile': 'Get driver profile',
        'PUT /api/auth/profile': 'Update driver profile'
      },
      driver: {
        'GET /api/driver/profile': 'Get driver details',
        'PUT /api/driver/profile': 'Update driver profile',
        'POST /api/driver/verify-documents': 'Upload and verify documents',
        'GET /api/driver/status': 'Get driver status'
      },
      schedules: {
        'GET /api/schedules': 'Get driver schedules from NDX',
        'GET /api/schedules/active': 'Get active schedules',
        'POST /api/schedules/accept': 'Accept schedule assignment',
        'POST /api/schedules/start': 'Start scheduled journey'
      },
      tracking: {
        'POST /api/tracking/start': 'Start location tracking',
        'POST /api/tracking/update': 'Update driver location',
        'POST /api/tracking/stop': 'Stop location tracking',
        'GET /api/tracking/history': 'Get tracking history'
      }
    },
    integration: {
      ndxService: 'Fetches schedules and journey data from NDX server',
      apiGateway: 'Routes requests through DPI API Gateway',
      realTimeTracking: 'WebSocket connection for live location updates'
    }
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    suggestion: 'Check /api/docs for available endpoints'
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Driver API Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📦 Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully');
  mongoose.connection.close(() => {
    console.log('📦 Database connection closed');
    process.exit(0);
  });
});

app.listen(PORT, () => {
  console.log('\n🚛 =====================================');
  console.log('🚀 DRIVER API SERVER STARTED');
  console.log('🚛 =====================================');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📦 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log('🚛 =====================================');
  console.log('📱 INTEGRATION STATUS:');
  console.log(`   📡 API Gateway: ${process.env.API_GATEWAY_URL}`);
  console.log(`   🗄️  NDX Service: ${process.env.NDX_SERVICE_URL}`);
  console.log('🚛 =====================================');
  console.log('🎯 Ready for Driver Flutter App!');
  console.log('🚛 =====================================\n');
});

module.exports = app;