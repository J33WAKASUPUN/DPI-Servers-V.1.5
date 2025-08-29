const Ticket = require("../model/Ticket");
const Booking = require("../model/Booking");
const qrService = require("../services/qrService");

class TicketController {
  // Get passenger tickets
  static async getPassengerTickets(req, res) {
    try {
      const passenger = req.passenger;
      const { status, page = 1, limit = 10 } = req.query;

      const query = { passengerId: passenger.citizenId };
      if (status) query.status = status;

      const tickets = await Ticket.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Ticket.countDocuments(query);

      // Enhance tickets with additional info
      const enhancedTickets = tickets.map((ticket) => ({
        ...ticket.toObject(),
        isExpired: ticket.isExpired(),
        canBeValidated: ticket.canBeValidated(),
        timeUntilDeparture: ticket.ticketDetails.departureTime
          ? Math.max(
              0,
              Math.floor(
                (new Date(ticket.ticketDetails.departureTime) - new Date()) /
                  60000
              )
            )
          : null,
      }));

      res.json({
        success: true,
        data: {
          tickets: enhancedTickets,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / limit),
          },
        },
      });
    } catch (error) {
      console.error("Get passenger tickets error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get tickets",
        error: error.message,
      });
    }
  }

  // Get specific ticket details
  static async getTicketDetails(req, res) {
    try {
      const passenger = req.passenger;
      const { id } = req.params;

      const ticket = await Ticket.findOne({
        $or: [{ ticketId: id }, { _id: id }],
        passengerId: passenger.citizenId,
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      // Get associated booking
      const booking = await Booking.findOne({ bookingId: ticket.bookingId });

      res.json({
        success: true,
        data: {
          ticket: {
            ...ticket.toObject(),
            isExpired: ticket.isExpired(),
            canBeValidated: ticket.canBeValidated(),
            timeUntilDeparture: ticket.ticketDetails.departureTime
              ? Math.max(
                  0,
                  Math.floor(
                    (new Date(ticket.ticketDetails.departureTime) -
                      new Date()) /
                      60000
                  )
                )
              : null,
          },
          booking,
        },
      });
    } catch (error) {
      console.error("Get ticket details error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get ticket details",
        error: error.message,
      });
    }
  }

  // Get QR code for ticket
  static async getTicketQR(req, res) {
    try {
      const passenger = req.passenger;
      const { id } = req.params;
      const { format = "base64" } = req.query;

      const ticket = await Ticket.findOne({
        $or: [{ ticketId: id }, { _id: id }],
        passengerId: passenger.citizenId,
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      if (ticket.isExpired()) {
        return res.status(400).json({
          success: false,
          message: "Ticket has expired",
        });
      }

      // Generate new QR code if not exists or regenerate requested
      if (!ticket.qrCode || req.query.regenerate === "true") {
        let qrResult;

        if (format === "image") {
          qrResult = await qrService.generateQRCode(ticket);
        } else {
          qrResult = await qrService.generateQRCodeBase64(ticket);
        }

        if (qrResult.success) {
          ticket.qrCode = qrResult.data;
          await ticket.save();
        } else {
          return res.status(500).json({
            success: false,
            message: "Failed to generate QR code",
            error: qrResult.error,
          });
        }
      }

      res.json({
        success: true,
        data: {
          ticketId: ticket.ticketId,
          qrCode: ticket.qrCode,
          validUntil: ticket.validUntil,
          isExpired: ticket.isExpired(),
          canBeValidated: ticket.canBeValidated(),
        },
      });
    } catch (error) {
      console.error("Get ticket QR error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get QR code",
        error: error.message,
      });
    }
  }

  // Validate ticket (for drivers/conductors)
  static async validateTicket(req, res) {
    try {
      const { qrData, location } = req.body;
      const validatorId = req.passenger?.citizenId || req.driver?.id; // Could be validated by driver

      if (!qrData) {
        return res.status(400).json({
          success: false,
          message: "QR data is required",
        });
      }

      // Validate QR code format and security
      const qrValidation = await qrService.validateQRCode(qrData);

      if (!qrValidation.success) {
        return res.status(400).json({
          success: false,
          message: qrValidation.error,
        });
      }

      // Find ticket by QR data
      const ticket = await Ticket.findByQRCode(qrData);

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      if (!ticket.canBeValidated()) {
        return res.status(400).json({
          success: false,
          message: "Ticket cannot be validated",
          reason: ticket.isExpired()
            ? "expired"
            : ticket.validation.isValidated
            ? "already_validated"
            : "invalid_status",
        });
      }

      // Mark ticket as validated
      await ticket.markAsValidated(validatorId, location);

      res.json({
        success: true,
        message: "Ticket validated successfully",
        data: {
          ticketId: ticket.ticketId,
          passengerName: ticket.passengerName,
          seatNumber: ticket.ticketDetails.seatNumber,
          routeName: ticket.ticketDetails.routeName,
          validatedAt: ticket.validation.validatedAt,
          validatedBy: ticket.validation.validatedBy,
        },
      });
    } catch (error) {
      console.error("Validate ticket error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate ticket",
        error: error.message,
      });
    }
  }

  // Get active tickets for passenger
  static async getActiveTickets(req, res) {
    try {
      const passenger = req.passenger;

      const activeTickets = await Ticket.findActiveTickets(passenger.citizenId);

      // Enhance with real-time info
      const enhancedTickets = activeTickets.map((ticket) => ({
        ...ticket.toObject(),
        timeUntilDeparture: Math.max(
          0,
          Math.floor(
            (new Date(ticket.ticketDetails.departureTime) - new Date()) / 60000
          )
        ),
        canBeValidated: ticket.canBeValidated(),
        status: ticket.status,
      }));

      res.json({
        success: true,
        data: {
          tickets: enhancedTickets,
          total: enhancedTickets.length,
        },
      });
    } catch (error) {
      console.error("Get active tickets error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to get active tickets",
        error: error.message,
      });
    }
  }

  // Resend ticket (regenerate QR and send notification)
  static async resendTicket(req, res) {
    try {
      const passenger = req.passenger;
      const { id } = req.params;

      const ticket = await Ticket.findOne({
        $or: [{ ticketId: id }, { _id: id }],
        passengerId: passenger.citizenId,
      });

      if (!ticket) {
        return res.status(404).json({
          success: false,
          message: "Ticket not found",
        });
      }

      if (ticket.isExpired()) {
        return res.status(400).json({
          success: false,
          message: "Cannot resend expired ticket",
        });
      }

      // Regenerate QR code
      const qrResult = await qrService.generateQRCodeBase64(ticket);

      if (qrResult.success) {
        ticket.qrCode = qrResult.data;
        await ticket.save();

        // Here you could add email/SMS notification logic
        // await notificationService.sendTicket(passenger.email, ticket);

        res.json({
          success: true,
          message: "Ticket resent successfully",
          data: {
            ticketId: ticket.ticketId,
            qrCode: ticket.qrCode,
          },
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Failed to regenerate ticket",
          error: qrResult.error,
        });
      }
    } catch (error) {
      console.error("Resend ticket error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to resend ticket",
        error: error.message,
      });
    }
  }
}

module.exports = TicketController;
