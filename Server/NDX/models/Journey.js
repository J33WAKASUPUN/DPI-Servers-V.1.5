const mongoose = require('mongoose');

const journeySchema = new mongoose.Schema({
    scheduleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Schedule',
        required: true
    },
    passengerId: {
        type: String, // Change from ObjectId to String
        required: true
    },
    driverId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Driver',
        ref: 'Schedule.driverId'
    },
    routeDetails: {
        routeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Route'
        },
        routeName: String,
        startLocation: {
            name: String,
            coordinates: {
                type: [Number], // [longitude, latitude]
                index: '2dsphere'
            }
        },
        endLocation: {
            name: String,
            coordinates: {
                type: [Number], // [longitude, latitude]
                index: '2dsphere'
            }
        }
    },
    startTime: {
        type: Date,
        required: true
    },
    endTime: Date,
    status: {
        type: String,
        enum: ['booked', 'in-progress', 'completed', 'cancelled'],
        default: 'booked'
    },
    paymentStatus: {
        type: String,
        enum: ['pending', 'paid', 'refunded', 'failed'],
        default: 'pending'
    },
    paymentMethod: {
        type: String,
        enum: ['online', 'in-bus'],
        default: 'online'
    },
    ticketNumber: {
        type: String,
        unique: true,
        sparse: true
    },
    fare: {
        type: Number,
        required: true
    },
    seatNumber: String,
    qrCode: {
        type: String
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verifiedBy: {
        type: String, // Change from ObjectId to String to match citizenId format
        ref: 'Driver'
    },
    verifiedAt: Date,
    isAdditionalPassenger: {
        type: Boolean,
        default: false
    },
    additionalPassengerInfo: {
        name: String,
        email: String,
        phone: String,
        age: Number,
        gender: String,
        seatPreference: String
    }
}, {
    timestamps: true
});

// Generate ticket number
journeySchema.pre('save', async function(next) {
    if (!this.ticketNumber && (this.paymentStatus === 'paid' || this.paymentMethod === 'in-bus')) {
        // Generate a ticket number format: BUS-YYYYMMDD-XXXX (where XXXX is random)
        const date = new Date();
        const dateStr = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0');
        const random = Math.floor(1000 + Math.random() * 9000);
        this.ticketNumber = `BUS-${dateStr}-${random}`;
    }
    next();
});

// Create indexes for efficient querying
journeySchema.index({ passengerId: 1, createdAt: -1 });
journeySchema.index({ scheduleId: 1 });
journeySchema.index({ 'routeDetails.routeId': 1 });
journeySchema.index({ status: 1, paymentStatus: 1 });

const Journey = mongoose.model('Journey', journeySchema);
module.exports = Journey;