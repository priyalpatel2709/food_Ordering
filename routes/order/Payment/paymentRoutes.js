const express = require("express");
const router = express.Router();
const {
  protect,
  identifyTenant,
  allowedRoles,
  validateRequest,
  schemas,
} = require("../../../middleware/index");

const {
  giveRefund,
} = require("../../../controllers/order/Payment/paymentController");

router.post(
  "/refund/:orderId",
  validateRequest(schemas.giveRefund),
  identifyTenant,
  protect,
  allowedRoles("admin"),
  giveRefund
);

module.exports = router;
