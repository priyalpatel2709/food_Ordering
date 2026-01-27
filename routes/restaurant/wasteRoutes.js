const express = require("express");
const router = express.Router();
const { identifyTenant } = require("../../middleware/tenantMiddleware");
const { protect, authorize } = require("../../middleware/authMiddleware");
const { PERMISSIONS } = require("../../utils/permissions");

const {
    logWaste,
    getWasteLogs,
    getWasteStats,
    deleteWasteLog,
} = require("../../controllers/restaurant/wasteController");

// All routes require authentication and tenant identification
router.use(identifyTenant);
router.use(protect);

// Log new waste entry
router.post("/", authorize(PERMISSIONS.RESTAURANT_UPDATE), logWaste);

// Get all waste logs with filtering
router.get("/", authorize(PERMISSIONS.RESTAURANT_READ), getWasteLogs);

// Get waste statistics
router.get("/stats", authorize(PERMISSIONS.RESTAURANT_READ), getWasteStats);

// Delete waste log
router.delete("/:id", authorize(PERMISSIONS.RESTAURANT_DELETE), deleteWasteLog);

module.exports = router;
