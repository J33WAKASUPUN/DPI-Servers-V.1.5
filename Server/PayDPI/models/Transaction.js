const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    unique: true,
    required: true
  },
  journeyId: {
    type: String,
    required: true
  },
  passengerId: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'LKR',
    enum: ['LKR', 'USD']
  },
  paymentMethod: {
    type: String,
    enum: ['stripe', 'paypal', 'bank_transfer', 'cash', 'digital_wallet'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'],
    default: 'pending'
  },
  paymentIntentId: {
    type: String, // Stripe Payment Intent ID
    sparse: true
  },
  chargeId: {
    type: String, // Stripe Charge ID
    sparse: true
  },
  receiptUrl: {
    type: String
  },
  failureReason: {
    type: String
  },
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: {
    type: String
  },
  metadata: {
    routeName: String,
    vehicleNumber: String,
    seatNumber: String,
    driverName: String,
    fareBreakdown: {
      baseFare: Number,
      taxes: Number,
      discount: Number,
      subsidyApplied: Number
    }
  },
  processingFee: {
    type: Number,
    default: 0
  },
  netAmount: {
    type: Number
  },
  paymentGatewayResponse: {
    type: mongoose.Schema.Types.Mixed
  },
  ipAddress: String,
  userAgent: String,
  deviceInfo: {
    type: String
  }
}, {
  timestamps: true
});

// Calculate net amount before saving
transactionSchema.pre('save', function(next) {
  if (this.amount && this.processingFee) {
    this.netAmount = this.amount - this.processingFee;
  }
  next();
});

// Instance methods
transactionSchema.methods.markAsCompleted = function(chargeId, receiptUrl) {
  this.status = 'completed';
  this.chargeId = chargeId;
  this.receiptUrl = receiptUrl;
  return this.save();
};

transactionSchema.methods.markAsFailed = function(reason) {
  this.status = 'failed';
  this.failureReason = reason;
  return this.save();
};

// Static methods
transactionSchema.statics.findByJourney = function(journeyId) {
  return this.find({ journeyId }).sort({ createdAt: -1 });
};

transactionSchema.statics.findByPassenger = function(passengerId) {
  return this.find({ passengerId }).sort({ createdAt: -1 });
};

module.exports = mongoose.model('Transaction', transactionSchema);