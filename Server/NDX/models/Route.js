const mongoose = require("mongoose");

const stopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
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
  }
});

const routeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  },
  description: String,
  stops: [stopSchema],
  path: {
    type: {
      type: String,
      enum: ['LineString'],
      default: 'LineString'
    },
    coordinates: {
      type: [[Number]], // Array of [longitude, latitude] positions
      required: true
    }
  },
  distance: {
    type: Number, // in kilometers
    default: 0
  },
  costPerKm: {
    type: Number,
    default: 0
  },
  estimatedDuration: {
    type: Number, // in minutes
    default: 0
  },
  schedules: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Schedule'
  }]
}, { timestamps: true });

// Index for geospatial queries
stopSchema.index({ location: '2dsphere' });
routeSchema.index({ path: '2dsphere' });

const Route = mongoose.model("Route", routeSchema);
module.exports = Route;