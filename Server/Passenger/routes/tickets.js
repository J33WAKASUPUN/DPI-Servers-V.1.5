const express = require("express");
const { body } = require("express-validator");
// Fix: Change from 'controllers' to 'controller'
const TicketController = require("../controller/ticketController");
const { verifyToken, requireActiveAccount } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

// All ticket routes require authentication
router.use(verifyToken);
router.use(requireActiveAccount);

// Validation middleware
const validateTicketValidation = [
  body("qrData").notEmpty().withMessage("QR data is required"),
  body("location.coordinates")
    .optional()
    .isArray()
    .withMessage("Location coordinates must be an array"),
  body("location.address")
    .optional()
    .trim()
    .isLength({ min: 5 })
    .withMessage("Location address must be at least 5 characters"),
  handleValidationErrors,
];

// Ticket routes
router.get("/", TicketController.getPassengerTickets);
router.get("/active", TicketController.getActiveTickets);
router.get("/:id", TicketController.getTicketDetails);
router.get("/:id/qr", TicketController.getTicketQR);
router.post("/:id/resend", TicketController.resendTicket);

// Ticket validation route (public access for drivers/conductors)
router.post(
  "/validate",
  validateTicketValidation,
  TicketController.validateTicket
);

module.exports = router;
