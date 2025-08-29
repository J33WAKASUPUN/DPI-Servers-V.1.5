const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./config/database');
const http = require('http');
const socketService = require('./services/socketService');
const path = require('path');

// Import routes
const authRoutes = require('./routes/auth');
const scheduleRoutes = require('./routes/schedules');
const mapRoutes = require('./routes/map');
const bookingRoutes = require('./routes/bookings');
const ticketRoutes = require('./routes/tickets');
const passengerRoutes = require('./routes/passenger');

// Import new services
// COMMENTED OUT - Will implement later
// const notificationService = require('./services/notificationService');
const realTimeTrackingService = require('./services/realTimeTrackingService');

const app = express();
const PORT = process.env.PORT || 4002;

// Connect to Database
connectDB();

// Security Middleware
app.use(helmet());

// CORS Configuration
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || [
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
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Serve QR code images
app.use('/uploads/qr', express.static(path.join(__dirname, 'uploads/qr')));

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
socketService.initialize(server);

// Start notification service - COMMENTED OUT
// notificationService.startNotificationProcessor();

// Start real-time tracking service
realTimeTrackingService.start();

// Health Check
app.get('/health', (req, res) => {
  const socketStats = socketService.getStats();
  
  res.json({
    success: true,
    message: 'Passenger API Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    services: {
      sludi: 'connected',
      ndx: 'connected',
      payDPI: 'connected'
    },
    realTime: {
      socketConnections: socketStats.connectedClients,
      routeSubscriptions: socketStats.subscribedRoutes,
      scheduleSubscriptions: socketStats.subscribedSchedules,
      authenticatedPassengers: socketStats.authenticatedPassengers
    }
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/passenger', passengerRoutes);

// API Documentation
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'Passenger API Documentation',
    version: '1.0.0',
    baseUrl: `http://localhost:${PORT}`,
    endpoints: {
      authentication: {
        'POST /api/auth/register': 'Register new passenger',
        'POST /api/auth/login': 'Passenger login',
        'GET /api/auth/profile': 'Get passenger profile',
        'PUT /api/auth/profile': 'Update passenger profile'
      },
      schedules: {
        'GET /api/schedules': 'Get all schedules',
        'GET /api/schedules/active': 'Get active schedules only',
        'GET /api/schedules/search': 'Search schedules by criteria',
        'GET /api/schedules/:id': 'Get specific schedule details',
        'GET /api/schedules/:id/route': 'Get route path for schedule'
      },
      bookings: {
        'POST /api/bookings': 'Create new booking',
        'GET /api/bookings': 'Get passenger bookings',
        'GET /api/bookings/:id': 'Get specific booking details',
        'PUT /api/bookings/:id/cancel': 'Cancel booking',
        'POST /api/bookings/:id/payment': 'Process payment for booking'
      },
      tickets: {
        'GET /api/tickets': 'Get passenger tickets',
        'GET /api/tickets/active': 'Get active tickets',
        'GET /api/tickets/:id': 'Get specific ticket details',
        'GET /api/tickets/:id/qr': 'Get QR code for ticket',
        'POST /api/tickets/:id/resend': 'Resend ticket',
        'POST /api/tickets/validate': 'Validate ticket'
      },
      map: {
        'GET /api/map/routes/:routeId': 'Get route map data',
        'GET /api/map/buses/live': 'Get live bus locations',
        'GET /api/map/stops/nearby': 'Find nearby bus stops',
        'GET /api/map/directions': 'Get route directions'
      },
      passenger: {
        'GET /api/passenger/dashboard': 'Get passenger dashboard with analytics',
        'GET /api/passenger/history': 'Get travel history with filters',
        'PUT /api/passenger/preferences': 'Update notification and app preferences',
        'GET /api/passenger/favorites': 'Get favorite routes with live schedules',
        'POST /api/passenger/favorites': 'Add route to favorites',
        'DELETE /api/passenger/favorites/:routeId': 'Remove route from favorites',
        'POST /api/passenger/tracking/subscribe': 'Subscribe to real-time bus tracking',
        'DELETE /api/passenger/tracking/:scheduleId': 'Unsubscribe from tracking',
        'GET /api/passenger/tracking/:scheduleId/status': 'Get real-time bus status',
        'GET /api/passenger/tracking/:scheduleId/eta': 'Calculate ETA to passenger location'
      },
      // notifications: {
      //   'WebSocket Events': 'notification, eta-update, route-disruption, system-announcement'
      // },
      analytics: {
        'Dashboard': 'Travel stats, spending analytics, route usage, carbon footprint',
        'History': 'Filtered travel history with summary statistics',
        'Favorites': 'Route management with live schedule integration'
      }
    },
    features: {
      realTimeTracking: 'Live bus location updates with ETA calculations',
      // notifications: 'Email, SMS, and push notifications for arrivals and updates',
      analytics: 'Dashboard analytics for travel behavior and preferences'
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
  console.error('Passenger API Error:', err);
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Stop services
  // notificationService.stopNotificationProcessor(); // COMMENTED OUT
  realTimeTrackingService.stop();
  
  // Close server
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Use server instead of app for listen
server.listen(PORT, () => {
  console.log('\n🚌 =====================================');
  console.log('🚀 PASSENGER API SERVER STARTED');
  console.log('🚌 =====================================');
  console.log(`📍 Server URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
  console.log(`📦 Database: ${mongoose.connection.readyState === 1 ? 'Connected' : 'Connecting...'}`);
  console.log('🚌 =====================================');
  console.log('📱 INTEGRATION STATUS:');
  console.log(`   📡 API Gateway: ${process.env.API_GATEWAY_URL}`);
  console.log(`   🔐 SLUDI Service: ${process.env.SLUDI_URL}`);
  console.log(`   🗄️  NDX Service: ${process.env.NDX_URL}`);
  console.log(`   💳 PayDPI Service: ${process.env.PAYDPI_URL}`);
  console.log('🚌 =====================================');
  console.log('📡 REAL-TIME FEATURES:');
  console.log('   🗺️  Live Bus Tracking: Enabled');
  console.log('   📍 Route Subscriptions: Enabled');
  console.log('   🚌 Schedule Tracking: Enabled');
  console.log('   📱 WebSocket Server: Active');
  console.log('🚌 =====================================');
  console.log('🎯 Ready for Passenger Flutter App!');
  console.log('🚌 =====================================\n');
});

module.exports = app;