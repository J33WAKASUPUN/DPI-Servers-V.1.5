const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.GATEWAY_PORT || 3000;

// Rate limiting - More lenient for development
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per minute
  message: {
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: '1 minute',
    limit: 100,
    window: '1 minute'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    'http://localhost:4001', // Driver API
    'http://localhost:4002', // Passenger API
    'http://localhost:5173', // Vite default
    'http://localhost:3005', // React default alternative
    'http://localhost:3006', // Flutter development server
    'http://192.168.43.187:3000', // Network access
    'http://192.168.43.187:3006', // Network access for Flutter
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Apply rate limiting conditionally
if (process.env.ENABLE_RATE_LIMITING !== 'false') {
  app.use(limiter);
  console.log('🛡️ Rate limiting enabled: 100 requests per minute');
} else {
  console.log('⚠️ Rate limiting disabled for development');
}

// Request logging middleware
app.use((req, res, next) => {
  console.log(`🌐 [${new Date().toISOString()}] ${req.method} ${req.path} → Routing to appropriate service`);
  next();
});

// Health check for gateway itself
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'DPI API Gateway is running',
    timestamp: new Date().toISOString(),
    gateway: {
      port: PORT,
      uptime: process.uptime(),
      memory: process.memoryUsage()
    },
    services: {
      sludi: 'http://localhost:3001',
      ndx: 'http://localhost:3002',
      paydpi: 'http://localhost:3003',
      driver: 'http://localhost:4001',
      passenger: 'http://localhost:4002'
    },
    version: '1.0.0'
  });
});

// Combined health check for all services
app.get('/health/all', async (req, res) => {
  try {
    const axios = require('axios');
    const services = {
      gateway: { status: 'healthy', port: PORT },
      sludi: { url: 'http://localhost:3001/health', status: 'unknown' },
      ndx: { url: 'http://localhost:3002/health', status: 'unknown' },
      paydpi: { url: 'http://localhost:3003/health', status: 'unknown' },
      driver: { url: 'http://localhost:4001/health', status: 'unknown' },
      passenger: { url: 'http://localhost:4002/health', status: 'unknown' }
    };

    // Check each service
    const healthChecks = Object.keys(services).filter(key => key !== 'gateway').map(async (serviceName) => {
      try {
        const response = await axios.get(services[serviceName].url, { timeout: 5000 });
        services[serviceName].status = response.status === 200 ? 'healthy' : 'unhealthy';
        services[serviceName].data = response.data;
      } catch (error) {
        services[serviceName].status = 'unhealthy';
        services[serviceName].error = error.message;
      }
    });

    await Promise.all(healthChecks);

    const allHealthy = Object.values(services).every(service => service.status === 'healthy');

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      message: allHealthy ? 'All services are healthy' : 'Some services are unhealthy',
      timestamp: new Date().toISOString(),
      services
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to check service health',
      error: error.message
    });
  }
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'DPI API Gateway Documentation',
    version: '1.0.0',
    services: {
      authentication: {
        name: 'SLUDI (Sri Lanka Unified Digital Identity)',
        baseUrl: '/api/auth',
        description: 'User authentication, registration, and OAuth services',
        endpoints: [
          'POST /api/auth/register - Register new citizen',
          'POST /api/auth/login - Login citizen',
          'GET /api/auth/profile - Get user profile',
          'PUT /api/auth/profile - Update profile',
          'POST /api/auth/refresh-token - Refresh access token',
          'GET /api/oauth/authorize - OAuth authorization',
          'POST /api/oauth/token - Token exchange'
        ]
      },
      dataExchange: {
        name: 'NDX (National Data Exchange)',
        baseUrl: '/api/routes',
        description: 'Transportation routes, schedules, and journey planning',
        endpoints: [
          'GET /api/routes/search-locations - Search locations',
          'GET /api/routes/find-routes - Find routes between points',
          'GET /api/routes/nearby-stops - Find nearby bus stops',
          'GET /api/schedules/route/:routeId - Get route schedules',
          'POST /api/journeys - Create journey',
          'POST /api/journeys/book - Book journey'
        ]
      },
      payments: {
        name: 'PayDPI (Payment Digital Public Infrastructure)',
        baseUrl: '/api/payments',
        description: 'Payment processing and subsidy management',
        endpoints: [
          'GET /api/payments/methods - Get payment methods',
          'POST /api/payments/process - Process payment',
          'GET /api/payments/history - Payment history',
          'GET /api/payments/transaction/:id - Get transaction',
          'POST /api/payments/transaction/:id/refund - Process refund',
          'POST /api/subsidies/apply - Apply for subsidy',
          'GET /api/subsidies/active - Get active subsidies'
        ]
      },
      driverServices: {
        name: 'Driver API (Driver Management & Tracking)',
        baseUrl: '/api/driver',
        description: 'Driver registration, profile management, and real-time tracking',
        endpoints: [
          'POST /api/driver/auth/register - Register new driver',
          'POST /api/driver/auth/login - Driver login',
          'GET /api/driver/profile - Get driver profile',
          'PUT /api/driver/profile - Update driver profile',
          'GET /api/driver/schedules - Get driver schedules',
          'POST /api/driver/schedules/accept - Accept schedule assignment',
          'POST /api/driver/tracking/start - Start location tracking',
          'POST /api/driver/tracking/update - Update driver location'
        ]
      },
      passengerServices: {
        name: 'Passenger API (Mobile App Backend)',
        baseUrl: '/api/passenger',
        description: 'Passenger registration, bookings, real-time tracking, and mobile app services',
        endpoints: [
          'POST /api/passenger/auth/register - Register new passenger',
          'POST /api/passenger/auth/login - Passenger login',
          'GET /api/passenger/profile - Get passenger profile',
          'PUT /api/passenger/profile - Update passenger profile',
          'POST /api/passenger/auth/verify-citizen - Verify with SLUDI',
          'GET /api/passenger/dashboard - Get dashboard analytics',
          'GET /api/passenger/history - Get travel history',
          'GET /api/passenger/favorites - Get favorite routes',
          'POST /api/passenger/favorites - Add route to favorites',
          'POST /api/passenger/tracking/subscribe - Subscribe to real-time tracking',
          'POST /api/bookings - Create new booking',
          'GET /api/bookings - Get passenger bookings',
          'POST /api/bookings/:id/payment - Process booking payment',
          'GET /api/tickets - Get passenger tickets',
          'GET /api/tickets/active - Get active tickets',
          'POST /api/tickets/validate - Validate ticket QR code',
          'GET /api/map/routes/:routeId - Get route map data',
          'GET /api/map/buses/live - Get live bus locations',
          'GET /api/map/stops/nearby - Find nearby bus stops'
        ]
      }
    },
    usage: {
      authentication: 'All requests except auth endpoints require Authorization: Bearer <token>',
      rateLimit: '100 requests per minute per IP',
      cors: 'Enabled for localhost and common development ports'
    }
  });
});

// Update the createProxy function to handle path rewriting correctly
const createProxy = (target, pathRewrite = {}) => {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite,
    timeout: 30000,
    proxyTimeout: 30000,
    onError: (err, req, res) => {
      console.error(`❌ Proxy Error for ${req.path}:`, err.message);
      if (!res.headersSent) {
        res.status(502).json({
          success: false,
          message: 'Service temporarily unavailable',
          error: 'Gateway proxy error',
          service: target,
          timestamp: new Date().toISOString()
        });
      }
    },
    onProxyReq: (proxyReq, req, res) => {
      console.log(`🔄 Proxying ${req.method} ${req.path} → ${target}${pathRewrite[req.path] || req.path}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`✅ Response ${proxyRes.statusCode} for ${req.method} ${req.path}`);
    }
  });
};

// ========================================
// ROUTING CONFIGURATION
// ========================================

// SLUDI (Authentication) Routes
app.use('/api/auth', createProxy('http://localhost:3001'));
app.use('/api/oauth', createProxy('http://localhost:3001'));
app.use('/api/profile', createProxy('http://localhost:3001'));

// Driver Authentication Routes (PUBLIC)
app.use('/api/driver/auth', createProxy('http://localhost:4001', {
  '^/api/driver/auth': '/api/auth'
}));

// Driver Schedule & Tracking Routes (PROTECTED)
app.use('/api/driver/schedules', createProxy('http://localhost:4001', {
  '^/api/driver/schedules': '/api/schedules'
}));

app.use('/api/driver/tracking', createProxy('http://localhost:4001', {
  '^/api/driver/tracking': '/api/tracking'
}));

// Driver Profile Routes (PROTECTED)
app.use('/api/driver', createProxy('http://localhost:4001', {
  '^/api/driver': '/api/driver'
}));

// Passenger Authentication Routes (PUBLIC)
app.use('/api/passenger/auth', createProxy('http://localhost:4002', {
  '^/api/passenger/auth': '/api/auth'
}));

// Passenger Profile & Services Routes (PROTECTED)
app.use('/api/passenger', createProxy('http://localhost:4002', {
  '^/api/passenger': '/api/passenger'
}));

// Passenger Bookings Routes (PROTECTED)
app.use('/api/bookings', createProxy('http://localhost:4002'));

// Passenger Tickets Routes (PROTECTED)
app.use('/api/tickets', createProxy('http://localhost:4002'));

// Passenger Map Services (PUBLIC/PROTECTED)
app.use('/api/passenger/auth', createProxy('http://localhost:4002', {
  '^/api/passenger/auth': '/api/auth'
}));

app.use('/api/map', createProxy('http://localhost:4002'));

// NDX (National Data Exchange) Routes  
app.use('/api/routes', createProxy('http://localhost:3002'));
app.use('/api/journeys', createProxy('http://localhost:3002'));
app.use('/api/schedules', createProxy('http://localhost:3002')); // This stays for NDX

// PayDPI (Payment) Routes
app.use('/api/payments', createProxy('http://localhost:3003'));
app.use('/api/subsidies', createProxy('http://localhost:3003'));

// OAuth callback for frontend apps (keeping your existing functionality)
app.get('/callback', (req, res) => {
  const { code, state, error, error_description } = req.query;
  
  if (error) {
    return res.status(400).json({
      success: false,
      error,
      error_description,
      message: 'OAuth authorization failed'
    });
  }
  
  if (code) {
    // For API clients, return JSON
    if (req.headers.accept && req.headers.accept.includes('application/json')) {
      return res.json({
        success: true,
        message: 'OAuth authorization successful',
        code,
        state,
        expires_in: 600 // 10 minutes
      });
    }
    
    // For browser clients, return HTML (your existing implementation)
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>OAuth Success</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 50px; text-align: center; }
          .success { color: #28a745; background: #d4edda; padding: 20px; border-radius: 5px; max-width: 600px; margin: 0 auto; }
          .code-box { background: #f8f9fa; padding: 15px; margin: 10px 0; border-left: 4px solid #007bff; font-family: monospace; text-align: left; }
          button { background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin: 5px; }
        </style>
      </head>
      <body>
        <div class="success">
          <h2>✅ OAuth Authorization Successful!</h2>
          <p><strong>Authorization Code:</strong></p>
          <div class="code-box" id="authCode">${code}</div>
          <p><strong>State:</strong> ${state}</p>
          <p><strong>Expires:</strong> 10 minutes from now</p>
          <button onclick="copyCode()">Copy Code</button>
          <button onclick="window.close()">Close</button>
        </div>
        <script>
          function copyCode() {
            navigator.clipboard.writeText('${code}').then(() => {
              alert('Authorization code copied to clipboard!');
            });
          }
          console.log('Authorization Code:', '${code}');
          console.log('State:', '${state}');
        </script>
      </body>
      </html>
    `);
  } else {
    res.status(400).json({
      success: false,
      message: 'No authorization code received'
    });
  }
});

// Service discovery endpoint
app.get('/api/services', (req, res) => {
  res.json({
    success: true,
    services: [
      {
        name: 'SLUDI',
        description: 'Sri Lanka Unified Digital Identity',
        port: 3001,
        status: 'active',
        routes: ['/api/auth/*', '/api/oauth/*', '/api/profile/*']
      },
      {
        name: 'NDX', 
        description: 'National Data Exchange',
        port: 3002,
        status: 'active',
        routes: ['/api/routes/*', '/api/journeys/*', '/api/schedules/*']
      },
      {
        name: 'PayDPI',
        description: 'Payment Digital Public Infrastructure', 
        port: 3003,
        status: 'active',
        routes: ['/api/payments/*', '/api/subsidies/*']
      },
      {
        name: 'Driver API',
        description: 'Driver Management and Tracking',
        port: 4001,
        status: 'active',
        routes: ['/api/driver/*']
      },
      {
        name: 'Passenger API',
        description: 'Passenger Services and Mobile App Backend',
        port: 4002,
        status: 'active',
        routes: ['/api/passenger/*', '/api/bookings/*', '/api/tickets/*', '/api/map/*']
      }
    ]
  });
});

// 404 handler for unknown routes
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
    method: req.method,
    suggestion: 'Check /api/docs for available endpoints',
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Gateway Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal gateway error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n🛑 SIGINT received, shutting down gracefully');
  process.exit(0);
});

app.listen(PORT, () => {
  console.log('\n🌐 =====================================');
  console.log('🚀 DPI API GATEWAY STARTED');
  console.log('🌐 =====================================');
  console.log(`📍 Gateway URL: http://localhost:${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
  console.log(`🔍 All Services Health: http://localhost:${PORT}/health/all`);
  console.log(`🔗 OAuth Callback: http://localhost:${PORT}/callback`);
  console.log('🌐 =====================================');
  console.log('📡 ROUTING CONFIGURATION:');
  console.log('   /api/auth/*          → SLUDI (3001)');
  console.log('   /api/oauth/*         → SLUDI (3001)');
  console.log('   /api/profile/*       → SLUDI (3001)');
  console.log('   /api/routes/*        → NDX (3002)');
  console.log('   /api/journeys/*      → NDX (3002)');
  console.log('   /api/schedules/*     → NDX (3002)');
  console.log('   /api/payments/*      → PayDPI (3003)');
  console.log('   /api/subsidies/*     → PayDPI (3003)');
  console.log('   /api/driver/*        → Driver API (4001)');
  console.log('   /api/passenger/*     → Passenger API (4002)');
  console.log('   /api/bookings/*      → Passenger API (4002)');
  console.log('   /api/tickets/*       → Passenger API (4002)');
  console.log('   /api/map/*           → Passenger API (4002)');
  console.log('🌐 =====================================');
  console.log('🎯 Ready for all mobile app connections!');
  console.log('🚗 Driver App: Flutter → Gateway → Driver API');
  console.log('🚌 Passenger App: Flutter → Gateway → Passenger API');
  console.log('🌐 =====================================\n');
});

module.exports = app;