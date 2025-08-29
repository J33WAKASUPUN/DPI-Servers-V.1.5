const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      unique: true,
      required: true,
    },
    passengerId: {
      type: String, // citizenId from SLUDI
      required: true,
    },
    scheduleId: {
      type: String,
      required: true,
    },
    journeyId: {
      type: String, // Reference to NDX journey
      sparse: true,
    },
    routeDetails: {
      routeId: String,
      routeName: String,
      startLocation: {
        name: String,
        coordinates: [Number], // [longitude, latitude]
      },
      endLocation: {
        name: String,
        coordinates: [Number], // [longitude, latitude]
      },
      distance: Number,
      estimatedDuration: Number, // in minutes
    },
    passengerDetails: {
      name: String,
      phone: String,
      email: String,
      seatPreference: {
        type: String,
        enum: ["window", "aisle", "any"],
        default: "any",
      },
    },
    additionalPassengers: [
      {
        name: String,
        age: Number,
        seatPreference: {
          type: String,
          enum: ["window", "aisle", "any"],
          default: "any",
        },
        discountType: {
          type: String,
          enum: ["none", "child", "student", "senior"],
          default: "none",
        },
      },
    ],
    bookingDetails: {
      departureTime: {
        type: Date,
        required: true,
      },
      arrivalTime: Date,
      seatNumbers: [String],
      totalSeats: {
        type: Number,
        default: 1,
      },
    },
    pricing: {
      baseFare: {
        type: Number,
        required: true,
      },
      additionalCharges: {
        type: Number,
        default: 0,
      },
      discounts: {
        type: Number,
        default: 0,
      },
      taxes: {
        type: Number,
        default: 0,
      },
      totalAmount: {
        type: Number,
        required: true,
      },
      currency: {
        type: String,
        default: "LKR",
      },
    },
    paymentDetails: {
      paymentMethod: {
        type: String,
        enum: ["online", "cash", "card", "digital_wallet"],
        required: true,
      },
      paymentStatus: {
        type: String,
        enum: ["pending", "processing", "completed", "failed", "refunded"],
        default: "pending",
      },
      transactionId: String,
      paymentDate: Date,
      refundAmount: {
        type: Number,
        default: 0,
      },
      refundDate: Date,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed", "no_show"],
      default: "pending",
    },
    cancellationDetails: {
      cancelledAt: Date,
      cancelledBy: String,
      reason: String,
      refundEligible: {
        type: Boolean,
        default: false,
      },
    },
    metadata: {
      deviceInfo: String,
      ipAddress: String,
      userAgent: String,
      bookingSource: {
        type: String,
        enum: ["mobile_app", "web", "kiosk", "agent"],
        default: "mobile_app",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate booking ID before saving
bookingSchema.pre("save", async function (next) {
  if (!this.bookingId) {
    const date = new Date();
    const dateStr =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0");
    const random = Math.floor(100000 + Math.random() * 900000);
    this.bookingId = `BKG-${dateStr}-${random}`;
  }
  next();
});

// Calculate total amount before saving
bookingSchema.pre("save", function (next) {
  if (this.pricing.baseFare !== undefined) {
    this.pricing.totalAmount =
      this.pricing.baseFare +
      this.pricing.additionalCharges +
      this.pricing.taxes -
      this.pricing.discounts;
  }
  next();
});

// Instance methods
bookingSchema.methods.canBeCancelled = function () {
  const now = new Date();
  const departureTime = new Date(this.bookingDetails.departureTime);
  const timeDiff = departureTime - now;

  // Can cancel if departure is more than 2 hours away and status is confirmed
  return this.status === "confirmed" && timeDiff > 2 * 60 * 60 * 1000;
};

bookingSchema.methods.calculateRefundAmount = function () {
  if (!this.canBeCancelled()) return 0;

  const now = new Date();
  const departureTime = new Date(this.bookingDetails.departureTime);
  const hoursUntilDeparture = (departureTime - now) / (1000 * 60 * 60);

  // Refund policy
  if (hoursUntilDeparture > 24) {
    return this.pricing.totalAmount * 0.9; // 90% refund
  } else if (hoursUntilDeparture > 2) {
    return this.pricing.totalAmount * 0.5; // 50% refund
  }
  return 0;
};

// Static methods
bookingSchema.statics.findByPassenger = function (passengerId) {
  return this.find({ passengerId }).sort({ createdAt: -1 });
};

bookingSchema.statics.findActiveBookings = function (passengerId) {
  return this.find({
    passengerId,
    status: { $in: ["confirmed", "pending"] },
    "bookingDetails.departureTime": { $gte: new Date() },
  }).sort({ "bookingDetails.departureTime": 1 });
};

module.exports = mongoose.model("Booking", bookingSchema);
