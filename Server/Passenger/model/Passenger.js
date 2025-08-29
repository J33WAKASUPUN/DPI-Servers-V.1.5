const mongoose = require('mongoose');

const passengerSchema = new mongoose.Schema({
  citizenId: {
    type: String,
    required: true,
    unique: true
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  dateOfBirth: {
    type: Date
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Sri Lanka' }
  },
  preferences: {
    favoriteRoutes: [{
      routeId: String,
      routeName: String,
      addedAt: { type: Date, default: Date.now }
    }],
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'digital_wallet', 'bank_transfer'],
      default: 'cash'
    },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true }
    },
    language: { type: String, default: 'en' }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending_verification'],
    default: 'pending_verification'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  // Temporary fields for registration flow
  tempPassword: {
    type: String,
    select: false // Don't include in queries by default
  },
  registrationMethod: {
    type: String,
    enum: ['direct', 'sludi'],
    default: 'direct'
  },
  verificationCode: String,
  lastLogin: Date,
  bookingHistory: [{
    bookingId: String,
    scheduleId: String,
    routeName: String,
    date: Date,
    amount: Number
  }],
  totalJourneys: {
    type: Number,
    default: 0
  },
  totalSpent: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Virtual for full name
passengerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Instance method to update last login
passengerSchema.methods.updateLastLogin = function() {
  this.lastLogin = new Date();
  return this.save();
};

// Instance method to add to booking history
passengerSchema.methods.addToBookingHistory = function(bookingData) {
  this.bookingHistory.push(bookingData);
  this.totalJourneys += 1;
  this.totalSpent += bookingData.amount || 0;
  return this.save();
};

// Instance method to add to favorites
passengerSchema.methods.addToFavorites = function(routeId, routeName) {
  const existingFavorite = this.preferences.favoriteRoutes.find(
    fav => fav.routeId === routeId
  );
  
  if (!existingFavorite) {
    this.preferences.favoriteRoutes.push({
      routeId,
      routeName,
      addedAt: new Date()
    });
    return this.save();
  }
  
  return Promise.resolve(this);
};

// Instance method to remove from favorites
passengerSchema.methods.removeFromFavorites = function(routeId) {
  this.preferences.favoriteRoutes = this.preferences.favoriteRoutes.filter(
    fav => fav.routeId !== routeId
  );
  return this.save();
};

// Static method to find by citizen ID
passengerSchema.statics.findByCitizenId = function(citizenId) {
  return this.findOne({ citizenId });
};

passengerSchema.methods.getWithPassword = function() {
  return this.model('Passenger').findById(this._id).select('+tempPassword');
};

// Indexes
passengerSchema.index({ citizenId: 1 });
passengerSchema.index({ email: 1 });
passengerSchema.index({ phone: 1 });
passengerSchema.index({ status: 1, isVerified: 1 });

module.exports = mongoose.model('Passenger', passengerSchema);