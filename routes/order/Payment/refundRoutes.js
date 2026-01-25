const express = require("express");
const router = express.Router();
const {
  protect,
  identifyTenant,
  adminOnly,
} = require("../../../middleware/index");
const {
  addRefundToOrder,
} = require("../../../controllers/order/Payment/index");

router.post("/:orderId", identifyTenant, protect, addRefundToOrder);

module.exports = router;
