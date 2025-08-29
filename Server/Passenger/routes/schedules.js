const express = require("express");
// Fix: Change from 'controllers' to 'controller'
const ScheduleController = require("../controller/scheduleController");
const { verifyToken, requireActiveAccount } = require("../middleware/auth");

const router = express.Router();

// PUBLIC ROUTES (No authentication required for browsing)
router.get("/", ScheduleController.getAllSchedules);
router.get("/active", ScheduleController.getActiveSchedules);
router.get("/search", ScheduleController.searchSchedules);
router.get("/:id", ScheduleController.getScheduleDetails);
router.get("/:id/route", ScheduleController.getScheduleRoute);

// PROTECTED ROUTES (Authentication required for personalized features)
// These would be used for booking, favorites, etc. in Phase 3

module.exports = router;
