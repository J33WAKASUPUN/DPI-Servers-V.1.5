const mongoose = require('mongoose');

const driverSessionSchema = new mongoose.Schema({
  driverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Driver',
    required: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true
  },
  deviceInfo: {
    platform: String,
    model: String,
    version: String,
    appVersion: String
  },
  refreshToken: {
    type: String,
    required: true
  },
  ipAddress: String,
  userAgent: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
driverSessionSchema.index({ driverId: 1, isActive: 1 });
driverSessionSchema.index({ sessionId: 1 });
driverSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('DriverSession', driverSessionSchema);