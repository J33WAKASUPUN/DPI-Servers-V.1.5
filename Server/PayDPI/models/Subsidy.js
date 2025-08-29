const mongoose = require('mongoose');

const subsidySchema = new mongoose.Schema({
  subsidyId: {
    type: String,
    unique: true,
    required: true
  },
  citizenId: {
    type: String,
    required: true
  },
  subsidyType: {
    type: String,
    enum: ['student', 'senior', 'disabled', 'low_income', 'government_employee', 'military'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  eligibilityPeriod: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'suspended', 'pending_verification'],
    default: 'pending_verification'
  },
  verificationDocuments: [{
    documentType: {
      type: String,
      enum: ['student_id', 'birth_certificate', 'disability_certificate', 'income_certificate', 'employment_letter']
    },
    documentUrl: String,
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    }
  }],
  usageLimit: {
    monthly: {
      type: Number,
      default: 0 // 0 means unlimited
    },
    daily: {
      type: Number,
      default: 0
    },
    perTrip: {
      type: Number,
      default: 0
    }
  },
  usageTracking: {
    monthlyUsed: {
      type: Number,
      default: 0
    },
    dailyUsed: {
      type: Number,
      default: 0
    },
    lastUsedDate: Date,
    totalUsage: {
      type: Number,
      default: 0
    }
  },
  applicationDetails: {
    applicationDate: {
      type: Date,
      default: Date.now
    },
    verifiedBy: String,
    verificationDate: Date,
    notes: String
  }
}, {
  timestamps: true
});

// Check if subsidy is currently valid
subsidySchema.methods.isValid = function() {
  const now = new Date();
  return this.status === 'active' && 
         this.eligibilityPeriod.startDate <= now && 
         this.eligibilityPeriod.endDate >= now;
};

// Calculate subsidy amount for a given fare
subsidySchema.methods.calculateSubsidy = function(fareAmount) {
  if (!this.isValid()) return 0;
  
  if (this.percentage) {
    return Math.min(fareAmount * (this.percentage / 100), this.amount || fareAmount);
  }
  return Math.min(this.amount, fareAmount);
};

// Check usage limits
subsidySchema.methods.canUseSubsidy = function() {
  if (!this.isValid()) return false;
  
  // Check daily limit
  if (this.usageLimit.daily > 0) {
    const today = new Date().toDateString();
    const lastUsed = this.usageTracking.lastUsedDate?.toDateString();
    
    if (today === lastUsed && this.usageTracking.dailyUsed >= this.usageLimit.daily) {
      return false;
    }
  }
  
  // Check monthly limit
  if (this.usageLimit.monthly > 0 && this.usageTracking.monthlyUsed >= this.usageLimit.monthly) {
    return false;
  }
  
  return true;
};

// Record subsidy usage
subsidySchema.methods.recordUsage = function() {
  const today = new Date();
  const lastUsed = this.usageTracking.lastUsedDate;
  
  // Reset daily counter if new day
  if (!lastUsed || lastUsed.toDateString() !== today.toDateString()) {
    this.usageTracking.dailyUsed = 0;
  }
  
  // Reset monthly counter if new month
  if (!lastUsed || lastUsed.getMonth() !== today.getMonth() || lastUsed.getFullYear() !== today.getFullYear()) {
    this.usageTracking.monthlyUsed = 0;
  }
  
  this.usageTracking.dailyUsed += 1;
  this.usageTracking.monthlyUsed += 1;
  this.usageTracking.totalUsage += 1;
  this.usageTracking.lastUsedDate = today;
  
  return this.save();
};

// Static methods
subsidySchema.statics.findActiveByCitizen = function(citizenId) {
  return this.find({
    citizenId,
    status: 'active',
    'eligibilityPeriod.startDate': { $lte: new Date() },
    'eligibilityPeriod.endDate': { $gte: new Date() }
  });
};

module.exports = mongoose.model('Subsidy', subsidySchema);