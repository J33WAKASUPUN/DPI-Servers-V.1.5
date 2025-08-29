const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketId: {
      type: String,
      unique: true,
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
    },
    passengerId: {
      type: String,
      required: true,
    },
    passengerName: {
      type: String,
      required: true,
    },
    scheduleId: {
      type: String,
      required: true,
    },
    journeyId: String,
    ticketDetails: {
      seatNumber: String,
      departureTime: {
        type: Date,
        required: true,
      },
      arrivalTime: Date,
      routeName: String,
      vehicleNumber: String,
      driverName: String,
    },
    qrCode: {
      data: String,
      imageUrl: String,
      generatedAt: Date,
    },
    validation: {
      isValidated: {
        type: Boolean,
        default: false,
      },
      validatedAt: Date,
      validatedBy: String, // Driver ID who validated
      validationLocation: {
        coordinates: [Number],
        address: String,
      },
    },
    status: {
      type: String,
      enum: ["active", "used", "expired", "cancelled", "refunded"],
      default: "active",
    },
    validUntil: {
      type: Date,
      required: true,
    },
    metadata: {
      issuedAt: {
        type: Date,
        default: Date.now,
      },
      issuerType: {
        type: String,
        enum: ["system", "agent", "kiosk"],
        default: "system",
      },
    },
  },
  {
    timestamps: true,
  }
);

// Generate ticket ID before saving
ticketSchema.pre("save", async function (next) {
  if (!this.ticketId) {
    const date = new Date();
    const dateStr =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0");
    const random = Math.floor(10000 + Math.random() * 90000);
    this.ticketId = `TKT-${dateStr}-${random}`;
  }
  next();
});

// Set validUntil date before saving
ticketSchema.pre("save", function (next) {
  if (!this.validUntil && this.ticketDetails.departureTime) {
    // Ticket valid until 2 hours after departure time
    this.validUntil = new Date(
      this.ticketDetails.departureTime.getTime() + 2 * 60 * 60 * 1000
    );
  }
  next();
});

// Instance methods
ticketSchema.methods.isExpired = function () {
  return new Date() > this.validUntil;
};

ticketSchema.methods.canBeValidated = function () {
  return (
    this.status === "active" &&
    !this.isExpired() &&
    !this.validation.isValidated
  );
};

ticketSchema.methods.markAsValidated = function (validatorId, location) {
  this.validation.isValidated = true;
  this.validation.validatedAt = new Date();
  this.validation.validatedBy = validatorId;
  this.validation.validationLocation = location;
  this.status = "used";
  return this.save();
};

// Static methods
ticketSchema.statics.findByPassenger = function (passengerId) {
  return this.find({ passengerId }).sort({ createdAt: -1 });
};

ticketSchema.statics.findActiveTickets = function (passengerId) {
  return this.find({
    passengerId,
    status: "active",
    validUntil: { $gte: new Date() },
  }).sort({ "ticketDetails.departureTime": 1 });
};

ticketSchema.statics.findByQRCode = function (qrData) {
  return this.findOne({ "qrCode.data": qrData });
};

module.exports = mongoose.model("Ticket", ticketSchema);
