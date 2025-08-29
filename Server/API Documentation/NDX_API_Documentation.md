# 🛣️ NDX (National Data Exchange) API Documentation

## 📋 Overview
The NDX server provides transportation data services including route management, journey planning, schedule information, and location services for the Sri Lankan public transport system.

**Server Details:**
- **Port**: 3002
- **Base URL**: `http://localhost:3002`
- **Database**: MongoDB
- **Authentication**: JWT tokens from SLUDI server

## 🚀 Quick Start

### Prerequisites
1. **NDX Server Running**: `http://localhost:3002`
2. **MongoDB Connected**
3. **SLUDI Server**: Running for authentication (optional for public routes)

### Health Check
```http
GET http://localhost:3002/health
```

## 🔗 API Endpoints

### 🏥 Health & Status
- **GET** `/health` - Server health status

### 🗺️ Location Services
- **GET** `/api/routes/search-locations` - Search locations using geocoding
- **GET** `/api/routes/find-routes` - Find routes between two locations  
- **GET** `/api/routes/nearby-stops` - Get nearby transport stops

### 🚌 Route Management
- **GET** `/api/routes` - Get all routes
- **POST** `/api/routes` - Create new route (Admin)
- **GET** `/api/routes/:routeId/details` - Get specific route details

### 📅 Schedule Management  
- **GET** `/api/schedules` - Get all schedules
- **GET** `/api/schedules/route/:routeId` - Get schedules for specific route

### 🚶 Journey Services
- **GET** `/api/journeys` - Get journey history
- **POST** `/api/journeys` - Create journey record

## 📝 Detailed Endpoint Documentation

### Location Services

#### Search Locations
```http
GET /api/routes/search-locations?query=Colombo Fort
```

**Parameters:**
- `query` (required): Location search term

**Response:**
```json
{
  "success": true,
  "data": {
    "locations": [
      {
        "name": "Colombo Fort",
        "coordinates": [79.8511, 6.9344],
        "address": "Fort, Colombo, Sri Lanka"
      }
    ]
  }
}
```

#### Find Routes Between Locations
```http
GET /api/routes/find-routes?from=79.8511,6.9344&to=79.8607,6.9271
```

**Parameters:**
- `from` (required): Starting coordinates (longitude,latitude)
- `to` (required): Destination coordinates (longitude,latitude)

**Response:**
```json
{
  "success": true,
  "data": {
    "routes": [
      {
        "route": {
          "_id": "route123",
          "name": "Route 138",
          "description": "Colombo - Kandy",
          "distance": 115,
          "estimatedDuration": 180
        },
        "startStop": {
          "name": "Fort Bus Stand",
          "coordinates": [79.8511, 6.9344]
        },
        "endStop": {
          "name": "Kandy Bus Stand", 
          "coordinates": [80.6337, 7.2906]
        },
        "distance": 115000,
        "duration": 10800,
        "walkingDistanceToStart": 50,
        "walkingDistanceFromEnd": 100
      }
    ],
    "totalRoutes": 1
  }
}
```

#### Get Nearby Stops
```http
GET /api/routes/nearby-stops?lat=6.9344&lng=79.8511&radius=1000
```

**Parameters:**
- `lat` (required): Latitude
- `lng` (required): Longitude  
- `radius` (optional): Search radius in meters (default: 1000)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "routeId": "route123",
      "routeName": "Route 138",
      "stop": {
        "name": "Fort Bus Stand",
        "coordinates": [79.8511, 6.9344]
      },
      "distance": 45
    }
  ]
}
```

### Route Management

#### Get All Routes
```http
GET /api/routes
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "route123",
      "name": "Route 138",
      "description": "Colombo to Kandy Express",
      "distance": 115,
      "estimatedDuration": 180,
      "costPerKm": 2.5,
      "stops": [
        {
          "name": "Fort Bus Stand",
          "location": {
            "type": "Point",
            "coordinates": [79.8511, 6.9344]
          }
        }
      ],
      "schedules": ["schedule1", "schedule2"]
    }
  ]
}
```

#### Get Route Details
```http
GET /api/routes/route123/details
```

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "route123",
    "name": "Route 138",
    "description": "Colombo to Kandy Express",
    "distance": 115,
    "estimatedDuration": 180,
    "costPerKm": 2.5,
    "stops": [...],
    "schedules": [...]
  }
}
```

### Schedule Management

#### Get All Schedules
```http
GET /api/schedules
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "schedule123",
      "routeId": {
        "_id": "route123",
        "name": "Route 138"
      },
      "departureTime": "08:00",
      "arrivalTime": "11:00",
      "frequency": 30,
      "isActive": true
    }
  ]
}
```

#### Get Schedules by Route
```http
GET /api/schedules/route/route123
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "schedule123",
      "routeId": "route123",
      "departureTime": "08:00",
      "arrivalTime": "11:00",
      "frequency": 30,
      "isActive": true
    }
  ]
}
```

## 🔧 Debug Endpoints

### Token Debug
```http
GET /api/debug/token
Authorization: Bearer your-jwt-token
```

### Generate Test Token (Development Only)
```http
GET /api/debug/generate-token
```

## 🚨 Error Responses

### Validation Error (400)
```json
{
  "success": false,
  "message": "Latitude and longitude are required"
}
```

### Not Found (404)
```json
{
  "success": false,
  "message": "Route not found"
}
```

### Server Error (500)
```json
{
  "success": false,
  "message": "Failed to find routes",
  "error": "Database connection failed"
}
```

## 🔒 Authentication

Most endpoints are **public** and don't require authentication. For protected routes (marked as Admin), include JWT token from SLUDI:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Data Models

### Route
```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  distance: Number, // in kilometers
  estimatedDuration: Number, // in minutes
  costPerKm: Number,
  stops: [{
    name: String,
    location: {
      type: "Point",
      coordinates: [longitude, latitude]
    }
  }],
  path: {
    type: "LineString", 
    coordinates: [[longitude, latitude]]
  },
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Schedule
```javascript
{
  _id: ObjectId,
  routeId: ObjectId,
  departureTime: String, // "HH:MM"
  arrivalTime: String,
  frequency: Number, // minutes between services
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Journey
```javascript
{
  _id: ObjectId,
  passengerId: String,
  routeId: ObjectId,
  startLocation: {
    type: "Point",
    coordinates: [longitude, latitude]
  },
  endLocation: {
    type: "Point", 
    coordinates: [longitude, latitude]
  },
  startTime: Date,
  endTime: Date,
  distance: Number,
  fare: Number,
  status: String, // 'active', 'completed', 'cancelled'
  createdAt: Date
}
```

## 🧪 Testing Examples

### Complete Journey Planning Flow
```bash
# 1. Search for locations
GET /api/routes/search-locations?query=Colombo Fort

# 2. Find routes between locations
GET /api/routes/find-routes?from=79.8511,6.9344&to=79.8607,6.9271

# 3. Get route details
GET /api/routes/route123/details

# 4. Check schedules
GET /api/schedules/route/route123

# 5. Find nearby stops
GET /api/routes/nearby-stops?lat=6.9344&lng=79.8511&radius=1000
```

## 🛠️ Troubleshooting

### Common Issues

1. **Invalid Coordinates**
   - Ensure coordinates are in [longitude, latitude] format
   - Longitude: -180 to 180, Latitude: -90 to 90

2. **No Routes Found**
   - Try increasing search radius
   - Check if coordinates are within Sri Lanka

3. **Database Connection**
   - Verify MongoDB is running
   - Check connection string in .env

## 📞 Support

For NDX API issues:
- Check server logs for detailed errors
- Verify database connectivity
- Ensure coordinates are valid
- Test with smaller search radius

---

**NDX Server - Powering Sri Lanka's Transportation Data! 🚌**