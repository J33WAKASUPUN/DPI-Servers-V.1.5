const express = require("express");
// Fix: Change from 'controllers' to 'controller'
const MapController = require("../controller/mapController");

const router = express.Router();

// PUBLIC ROUTES (No authentication required for map data)
router.get("/routes/:routeId", MapController.getRouteMapData);
router.get("/buses/live", MapController.getLiveBusLocations);
router.get("/stops/nearby", MapController.findNearbyStops);
router.get("/directions", MapController.getRouteDirections);

module.exports = router;
