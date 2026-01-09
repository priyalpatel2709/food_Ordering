const express = require("express");
const router = express.Router();
const {
  protect,
  identifyTenant,
  allowedRoles,
  authorize,
} = require("../../middleware/index");

const { PERMISSIONS } = require("../../utils/permissions");

const {
  getKDSOrders,
  getKDSConfig,
  updateOrderItemStatus,
} = require("../../controllers/order/kdsController");

// Basic protection and tenant identification for all KDS routes
router.use(identifyTenant, protect);

router.get("/", authorize(PERMISSIONS.KDS_VIEW), getKDSOrders);
router.get(
  "/config",
  //  authorize(PERMISSIONS.KDS_VIEW),
  getKDSConfig
);
router.patch(
  "/:orderId/items/:itemId/status",
  authorize(PERMISSIONS.KDS_MANAGE),
  updateOrderItemStatus
);

module.exports = router;
