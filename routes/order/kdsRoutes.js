const express = require("express");
const router = express.Router();
const {
  protect,
  identifyTenant,
  allowedRoles,
} = require("../../middleware/index");

const {
  getKDSOrders,
  getKDSConfig,
  updateOrderItemStatus,
} = require("../../controllers/order/kdsController");

// Basic protection and tenant identification for all KDS routes
router.use(identifyTenant, protect);

router.get("/", getKDSOrders);
router.get("/config", getKDSConfig);
router.patch("/:orderId/items/:itemId/status", updateOrderItemStatus);

module.exports = router;
