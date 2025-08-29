const mongoose = require('mongoose');

const tokenSchema = new mongoose.Schema({
  citizenId: {
    type: String,
    required: true,
    ref: 'Citizen'
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  tokenType: {
    type: String,
    enum: ['access', 'refresh', 'oauth'],
    required: true
  },
  scope: {
    type: [String],
    default: ['basic']
  },
  clientId: {
    type: String,
    required: function() {
      return this.tokenType === 'oauth';
    }
  },
  issuedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isRevoked: {
    type: Boolean,
    default: false
  },
  revokedAt: Date,
  ipAddress: String,
  userAgent: String
}, {
  timestamps: true
});

// Index for automatic expiration
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Check if token is valid
tokenSchema.methods.isValid = function() {
  return !this.isRevoked && this.expiresAt > new Date();
};

// Revoke token
tokenSchema.methods.revoke = function() {
  this.isRevoked = true;
  this.revokedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Token', tokenSchema);