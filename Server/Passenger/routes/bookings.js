const express = require("express");
const { body } = require("express-validator");
// Fix: Change from 'controllers' to 'controller'
const BookingController = require("../controller/bookingController");
const { verifyToken, requireActiveAccount } = require("../middleware/auth");
const { handleValidationErrors } = require("../middleware/validation");

const router = express.Router();

// All booking routes require authentication
router.use(verifyToken);
router.use(requireActiveAccount);

// Validation middleware
const createBookingValidation = [
  body("scheduleId").notEmpty().withMessage("Schedule ID is required"),
  body("routeDetails.routeName")
    .notEmpty()
    .withMessage("Route name is required"),
  body("routeDetails.startLocation.name")
    .notEmpty()
    .withMessage("Start location is required"),
  body("routeDetails.endLocation.name")
    .notEmpty()
    .withMessage("End location is required"),
  body("bookingDetails.departureTime")
    .isISO8601()
    .withMessage("Valid departure time is required"),
  body("paymentMethod")
    .isIn(["online", "cash", "card", "digital_wallet"])
    .withMessage("Invalid payment method"),
  body("passengerDetails.name")
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage("Passenger name must be at least 2 characters"),
  body("additionalPassengers")
    .optional()
    .isArray()
    .withMessage("Additional passengers must be an array"),
  handleValidationErrors,
];

const processPaymentValidation = [
  body("paymentMethod")
    .optional()
    .isIn(["online", "cash", "card", "digital_wallet"])
    .withMessage("Invalid payment method"),
  body("applySubsidy")
    .optional()
    .isBoolean()
    .withMessage("Apply subsidy must be boolean"),
  handleValidationErrors,
];

const cancelBookingValidation = [
  body("reason")
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage("Reason must be 5-200 characters"),
  handleValidationErrors,
];

// Booking routes
router.post("/", createBookingValidation, BookingController.createBooking);
router.get("/", BookingController.getPassengerBookings);
router.get("/:id", BookingController.getBookingDetails);
router.put(
  "/:id/cancel",
  cancelBookingValidation,
  BookingController.cancelBooking
);
router.post(
  "/:id/payment",
  processPaymentValidation,
  BookingController.processPayment
);

module.exports = router;
