const mongoose = require('mongoose');

const trackingDataSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  scheduleId: {
    type: String,
    required: true
  },
  journeyId: {
    type: String
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  bearing: {
    type: Number,
    min: 0,
    max: 360
  },
  speed: {
    type: Number,
    min: 0
  },
  accuracy: {
    type: Number,
    min: 0
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  status: {
    type: String,
    enum: ['moving', 'stopped', 'idle'],
    default: 'moving'
  },
  batteryLevel: {
    type: Number,
    min: 0,
    max: 100
  },
  isOnline: {
    type: Boolean,
    default: true
  }
});

// Geospatial index for location queries
trackingDataSchema.index({ location: '2dsphere' });
trackingDataSchema.index({ driverId: 1, timestamp: -1 });
trackingDataSchema.index({ scheduleId: 1, timestamp: -1 });
trackingDataSchema.index({ timestamp: -1 });

module.exports = mongoose.model('TrackingData', trackingDataSchema);