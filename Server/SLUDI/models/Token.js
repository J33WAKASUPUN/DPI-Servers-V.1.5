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
    enum: [
      'access', 
      'refresh', 
      'oauth', 
      'sludi_oauth', 
      'sludi_auth_code',
      'sludi_access'    
    ],
    required: true
  },
  scope: {
    type: [String],
    default: ['basic']
  },
  clientId: {
    type: String,
    required: function() {
      return this.tokenType === 'oauth' || 
             this.tokenType === 'sludi_oauth' || 
             this.tokenType === 'sludi_auth_code' || 
             this.tokenType === 'sludi_access';
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
  userAgent: String,
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// Index for automatic expiration
tokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Index for performance
tokenSchema.index({ token: 1 });
tokenSchema.index({ citizenId: 1 });
tokenSchema.index({ tokenType: 1 });
tokenSchema.index({ clientId: 1 });

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