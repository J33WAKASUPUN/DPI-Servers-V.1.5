const Booking = require("../model/Booking");
const Ticket = require("../model/Ticket");
const Passenger = require("../model/Passenger");
const apiGateway = require("../config/apiGateway");
const qrService = require("../services/qrService");
const { v4: uuidv4 } = require("uuid");

class BookingController {
  // Create new booking
  static async createBooking(req, res) {
    try {
      const passenger = req.passenger;
      const {
        scheduleId,
        routeDetails,
        passengerDetails,
        additionalPassengers = [],
        bookingDetails,
        paymentMethod = "online",
      } = req.body;

      console.log(`🎫 Creating booking for passenger: ${passenger.citizenId}`);

      // Validate schedule availability
      const scheduleResponse = await apiGateway.getSchedulesFromNDX({
        scheduleId,
      });

      if (!scheduleResponse.success || scheduleResponse.data.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Schedule not found",
        });
      }

      const schedule = scheduleResponse.data[0];

      // Check seat availability
      const totalSeatsRequested = 1 + additionalPassengers.length;
      const availableSeats =
        schedule.capacity - (schedule.currentPassengers || 0);

      if (availableSeats < totalSeatsRequested) {
        return res.status(400).json({
          success: false,
          message: `Insufficient seats available. Requested: ${totalSeatsRequested}, Available: ${availableSeats}`,
        });
      }

      // Calculate pricing
      const baseFare = routeDetails.distance
        ? Math.round(routeDetails.distance * (schedule.routeId?.costPerKm || 2.5))
        : 50;

      let totalAmount = baseFare;

      // Add charges for additional passengers
      additionalPassengers.forEach((passenger) => {
        let passengerFare = baseFare;

        // Apply discounts
        switch (passenger.discountType) {
          case "child":
            passengerFare *= 0.5; // 50% discount for children
            break;
          case "student":
            passengerFare *= 0.8; // 20% discount for students
            break;
          case "senior":
            passengerFare *= 0.7; // 30% discount for seniors
            break;
        }

        totalAmount += passengerFare;
      });

      // Create booking
      const booking = new Booking({
        passengerId: passenger.citizenId,
        scheduleId,
        routeDetails,
        passengerDetails: {
          name: passengerDetails.name || passenger.fullName,
          phone: passengerDetails.phone || passenger.phone,
          email: passengerDetails.email || passenger.email,
          seatPreference: passengerDetails.seatPreference || "any",
        },
        additionalPassengers,
        bookingDetails: {
          departureTime: new Date(bookingDetails.departureTime),
          arrivalTime: bookingDetails.arrivalTime
            ? new Date(bookingDetails.arrivalTime)
            : null,
          totalSeats: totalSeatsRequested,
        },
        pricing: {
          baseFare,
          totalAmount,
          currency: "LKR",
        },
        paymentDetails: {
          paymentMethod,
          paymentStatus: paymentMethod === "cash" ? "completed" : "pending",
        },
        status: paymentMethod === "cash" ? "confirmed" : "pending",
        metadata: {
          deviceInfo: req.headers["user-agent"],
          ipAddress: req.ip,
          userAgent: req.headers["user-agent"],
        },
      });

      await booking.save();

      // For cash payments, create journey in NDX immediately
      if (paymentMethod === "cash") {
        try {
          await this.createJourneyInNDX(booking, req.token);
        } catch (ndxError) {
          console.warn("Failed to create NDX journey:", ndxError.message);
        }
      }

      // Update passenger booking history
      await passenger.addToBookingHistory({
        bookingId: booking.bookingId,
        scheduleId: booking.scheduleId,
        routeName: routeDetails.routeName,
        date: booking.bookingDetails.departureTime,
        amount: booking.pricing.totalAmount,
      });

      res.status(201).json({
        success: true,
        message: "Booking created successfully",
        data: {
          booking: {
            bookingId: booking.bookingId,
            scheduleId: booking.scheduleId,
            routeDetails: booking.routeDetails,
            bookingDetails: booking.bookingDetails,
            pricing: booking.pricing,
            paymentDetails: booking.paymentDetails,
            status: booking.status,
            totalSeats: booking.bookingDetails.totalSeats,
          },
        },
      });
    } catch (error) {
      console.error("Create booking error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create booking",
        error: error.message,
      });
    }
  }

  // Get passenger bookings
  static async getPassengerBookings(req, res) {
    try {
      const passenger = req.passenger;
      const { status, page = 1, limit = 10 } = req.query;

      const query = { passengerId: passenger.citizenId };
      if (status) query.status = status;

      const bookings = await Booking.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Booking.countDocuments(query);

      res.json({
        success: true,
        data: {
          bookings,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get passenger bookings error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get bookings",
        error: error.message,
      });
    }
  }

  // Get specific booking details
  static async getBookingDetails(req, res) {
    try {
      const passenger = req.passenger;
      const { id } = req.params;

      const booking = await Booking.findOne({
        $or: [{ bookingId: id }, { _id: id }],
        passengerId: passenger.citizenId,
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      // Get associated tickets
      const tickets = await Ticket.find({ bookingId: booking.bookingId });

      res.json({
        success: true,
        data: {
          booking,
          tickets,
          canBeCancelled: booking.canBeCancelled(),
          refundAmount: booking.calculateRefundAmount(),
        },
      });
    } catch (error) {
      console.error("Get booking details error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get booking details",
        error: error.message,
      });
    }
  }

  // Cancel booking
  static async cancelBooking(req, res) {
    try {
      const passenger = req.passenger;
      const { id } = req.params;
      const { reason } = req.body;

      const booking = await Booking.findOne({
        $or: [{ bookingId: id }, { _id: id }],
        passengerId: passenger.citizenId,
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (!booking.canBeCancelled()) {
        return res.status(400).json({
          success: false,
          message: "Booking cannot be cancelled",
        });
      }

      const refundAmount = booking.calculateRefundAmount();

      // Update booking
      booking.status = "cancelled";
      booking.cancellationDetails = {
        cancelledAt: new Date(),
        cancelledBy: passenger.citizenId,
        reason: reason || "Cancelled by passenger",
        refundEligible: refundAmount > 0,
      };

      await booking.save();

      // Cancel associated tickets
      await Ticket.updateMany(
        { bookingId: booking.bookingId },
        { status: "cancelled" }
      );

      // Process refund if eligible
      let refundResult = null;
      if (refundAmount > 0 && booking.paymentDetails.transactionId) {
        try {
          refundResult = await apiGateway.processPaymentWithPayDPI(
            {
              action: "refund",
              transactionId: booking.paymentDetails.transactionId,
              amount: refundAmount,
              reason: reason || "Booking cancellation",
            },
            req.token
          );
        } catch (refundError) {
          console.warn("Refund processing failed:", refundError.message);
        }
      }

      res.json({
        success: true,
        message: "Booking cancelled successfully",
        data: {
          bookingId: booking.bookingId,
          status: booking.status,
          refundAmount,
          refundProcessed: refundResult?.success || false,
          cancellationDetails: booking.cancellationDetails,
        },
      });
    } catch (error) {
      console.error("Cancel booking error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to cancel booking",
        error: error.message,
      });
    }
  }

  // Process payment for booking
  static async processPayment(req, res) {
    try {
      const passenger = req.passenger;
      const { id } = req.params;
      const { paymentMethod, paymentDetails, applySubsidy = false } = req.body;

      const booking = await Booking.findOne({
        $or: [{ bookingId: id }, { _id: id }],
        passengerId: passenger.citizenId,
      });

      if (!booking) {
        return res.status(404).json({
          success: false,
          message: "Booking not found",
        });
      }

      if (booking.paymentDetails.paymentStatus === "completed") {
        return res.status(400).json({
          success: false,
          message: "Payment already completed",
        });
      }

      console.log(`💳 Processing payment for booking: ${booking.bookingId}`);

      // Update payment method if different
      if (paymentMethod) {
        booking.paymentDetails.paymentMethod = paymentMethod;
      }

      // Process payment through PayDPI
      const paymentResult = await apiGateway.processPaymentWithPayDPI(
        {
          journeyId: booking.journeyId || booking.bookingId,
          amount: booking.pricing.totalAmount,
          paymentMethod: booking.paymentDetails.paymentMethod,
          paymentDetails,
          applySubsidy,
          metadata: {
            bookingId: booking.bookingId,
            passengerId: booking.passengerId,
            routeName: booking.routeDetails.routeName,
            scheduleId: booking.scheduleId,
          },
        },
        req.token
      );

      if (paymentResult.success) {
        // Update booking payment details
        booking.paymentDetails.paymentStatus = "completed";
        booking.paymentDetails.transactionId = paymentResult.data.transactionId;
        booking.paymentDetails.paymentDate = new Date();
        booking.status = "confirmed";

        await booking.save();

        // Create journey in NDX
        try {
          await this.createJourneyInNDX(booking, req.token);
        } catch (ndxError) {
          console.warn("Failed to create NDX journey:", ndxError.message);
        }

        // Generate tickets
        const tickets = await this.generateTickets(booking);

        res.json({
          success: true,
          message: "Payment processed successfully",
          data: {
            booking,
            tickets,
            paymentDetails: paymentResult.data,
          },
        });
      } else {
        // Update booking with failed payment
        booking.paymentDetails.paymentStatus = "failed";
        await booking.save();

        res.status(400).json({
          success: false,
          message: "Payment processing failed",
          error: paymentResult.message,
        });
      }
    } catch (error) {
      console.error("Process payment error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to process payment",
        error: error.message,
      });
    }
  }

  // Helper method to create journey in NDX
  static async createJourneyInNDX(booking, token) {
    try {
      // Create main passenger journey
      const journeyData = {
        scheduleId: booking.scheduleId,
        passengerId: booking.passengerId,
        startLocation: booking.routeDetails.startLocation,
        endLocation: booking.routeDetails.endLocation,
        fare: booking.pricing.baseFare,
        seatNumber: booking.bookingDetails.seatNumbers?.[0],
        paymentMethod: booking.paymentDetails.paymentMethod,
        paymentStatus: booking.paymentDetails.paymentStatus,
      };

      const journeyResponse = await apiGateway.createJourneyInNDX(
        journeyData,
        token
      );

      if (journeyResponse.success) {
        booking.journeyId = journeyResponse.data._id;
        await booking.save();
      }

      return journeyResponse;
    } catch (error) {
      console.error("NDX journey creation error:", error);
      throw error;
    }
  }

  // Helper method to generate tickets
  static async generateTickets(booking) {
    try {
      const tickets = [];
      const totalTickets = 1 + booking.additionalPassengers.length;

      // Generate ticket for main passenger
      const mainTicket = new Ticket({
        bookingId: booking.bookingId,
        passengerId: booking.passengerId,
        passengerName: booking.passengerDetails.name,
        scheduleId: booking.scheduleId,
        journeyId: booking.journeyId,
        ticketDetails: {
          seatNumber: booking.bookingDetails.seatNumbers?.[0],
          departureTime: booking.bookingDetails.departureTime,
          arrivalTime: booking.bookingDetails.arrivalTime,
          routeName: booking.routeDetails.routeName,
        },
      });

      // Generate QR code
      const qrResult = await qrService.generateQRCodeBase64(mainTicket);
      if (qrResult.success) {
        mainTicket.qrCode = qrResult.data;
      }

      await mainTicket.save();
      tickets.push(mainTicket);

      // Generate tickets for additional passengers
      for (let i = 0; i < booking.additionalPassengers.length; i++) {
        const additionalPassenger = booking.additionalPassengers[i];

        const additionalTicket = new Ticket({
          bookingId: booking.bookingId,
          passengerId: booking.passengerId, // Same passenger ID as booker
          passengerName: additionalPassenger.name,
          scheduleId: booking.scheduleId,
          journeyId: booking.journeyId,
          ticketDetails: {
            seatNumber: booking.bookingDetails.seatNumbers?.[i + 1],
            departureTime: booking.bookingDetails.departureTime,
            arrivalTime: booking.bookingDetails.arrivalTime,
            routeName: booking.routeDetails.routeName,
          },
        });

        // Generate QR code
        const additionalQrResult = await qrService.generateQRCodeBase64(
          additionalTicket
        );
        if (additionalQrResult.success) {
          additionalTicket.qrCode = additionalQrResult.data;
        }

        await additionalTicket.save();
        tickets.push(additionalTicket);
      }

      return tickets;
    } catch (error) {
      console.error("Ticket generation error:", error);
      throw error;
    }
  }
}

module.exports = BookingController;
