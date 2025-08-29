const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route',
    required: true
  },
  driverId: {
    type: String,
    required: true
  },
  driverName: {
    type: String,
    required: true
  },
  vehicleNumber: {
    type: String,
    required: true
  },
  departureTime: {
    type: Date,
    required: true
  },
  arrivalTime: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['scheduled', 'active', 'completed', 'cancelled', 'delayed'],
    default: 'scheduled'
  },
  currentLocation: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      default: [0, 0]
    }
  },
  lastLocationUpdate: {
    type: Date,
    default: Date.now
  },
  capacity: {
    type: Number,
    default: 50
  },
  currentPassengers: {
    type: Number,
    default: 0
  },
  estimatedArrival: {
    type: Date
  },
  stops: [{
    stopId: mongoose.Schema.Types.ObjectId,
    stopName: String,
    scheduledTime: Date,
    actualTime: Date,
    status: {
      type: String,
      enum: ['pending', 'arrived', 'departed'],
      default: 'pending'
    }
  }]
}, { timestamps: true });

// Index for geospatial queries
scheduleSchema.index({ currentLocation: '2dsphere' });
scheduleSchema.index({ routeId: 1, departureTime: 1 });
scheduleSchema.index({ driverId: 1 });
scheduleSchema.index({ status: 1 });

const Schedule = mongoose.model('Schedule', scheduleSchema);
module.exports = Schedule;