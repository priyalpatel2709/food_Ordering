const express = require("express");
const router = express.Router();
const {
  identifyTenant,
  protect,
  allowedRoles,
} = require("../../middleware/index");
const {
  getDashboardStats,
  exportDashboardReport,
} = require("../../controllers/restaurant/dashboardController");

/**
 * Dashboard Routes
 * Only accessible by Manager and Admin
 */
router.get("/stats", identifyTenant, protect, getDashboardStats);
// router.get("/export", identifyTenant, protect, exportDashboardReport);

module.exports = router;
