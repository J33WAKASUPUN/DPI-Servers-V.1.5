const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const driverSchema = new mongoose.Schema({
  // Personal Information
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[0-9]{10}$/, 'Please enter a valid 10-digit phone number']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },

  // Driver-specific Information
  licenseNumber: {
    type: String,
    required: [true, 'License number is required'],
    unique: true,
    trim: true
  },
  licenseExpiry: {
    type: Date,
    required: [true, 'License expiry date is required']
  },
  vehicleNumber: {
    type: String,
    required: [true, 'Vehicle number is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  vehicleType: {
    type: String,
    required: [true, 'Vehicle type is required'],
    enum: ['bus', 'van', 'car', 'truck'],
    default: 'bus'
  },
  
  // Status and Verification
  status: {
    type: String,
    enum: ['pending', 'active', 'suspended', 'inactive'],
    default: 'pending'
  },
  isVerified: {
    type: Boolean,
    default: false
  },

  // Current Journey Information
  currentJourney: {
    journeyId: { type: String },
    scheduleId: { type: String },
    status: {
      type: String,
      enum: ['inactive', 'assigned', 'started', 'completed']
    },
    startedAt: { type: Date },
    estimatedEndTime: { type: Date }
  },

  // Location and Tracking
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number },
    bearing: { type: Number },
    speed: { type: Number },
    accuracy: { type: Number },
    timestamp: { type: Date }
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  lastActive: {
    type: Date,
    default: Date.now
  },

  // Security
  refreshTokens: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date }
  }],

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
driverSchema.index({ email: 1 });
driverSchema.index({ licenseNumber: 1 });
driverSchema.index({ vehicleNumber: 1 });
driverSchema.index({ 'currentLocation.latitude': 1, 'currentLocation.longitude': 1 });

// Hash password before saving
driverSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, parseInt(process.env.BCRYPT_SALT_ROUNDS) || 12);
  next();
});

// Update the updatedAt field before saving
driverSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Instance method to check password
driverSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to update location
driverSchema.methods.updateLocation = function(locationData) {
  this.currentLocation = {
    ...locationData,
    timestamp: new Date()
  };
  this.lastActive = new Date();
  return this.save();
};

// Virtual for driver's full name
driverSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Transform output
driverSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.refreshTokens;
    delete ret.passwordResetToken;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Driver', driverSchema);