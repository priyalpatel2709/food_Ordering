const express = require("express");
const router = express.Router();
const {
  identifyTenant,
  protect,
  authorize,
} = require("../../middleware/index");
const { PERMISSIONS } = require("../../utils/permissions");

const {
  getDashboardStats,
  exportDashboardReport,
} = require("../../controllers/restaurant/dashboardController");

/**
 * Dashboard Routes
 * Only accessible by Manager and Admin
 */
router.get("/stats", identifyTenant, protect, authorize(PERMISSIONS.REPORT_VIEW), getDashboardStats);
// router.get("/export", identifyTenant, protect, authorize(PERMISSIONS.REPORT_EXPORT), exportDashboardReport);

module.exports = router;
