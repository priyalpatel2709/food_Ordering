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
  processPayment,
  payForItem,
  generateBill,
} = require("../../../controllers/order/Payment/paymentController");

router.post(
  "/refund/:orderId",
  validateRequest(schemas.giveRefund),
  identifyTenant,
  protect,
  allowedRoles("staff"),
  giveRefund,
);

router.post(
  "/processPayment/:orderId",
  validateRequest(schemas.processPayment),
  identifyTenant,
  protect,
  // allowedRoles("admin"),
  processPayment,
);

router.post("/payForItem", identifyTenant, protect, payForItem);

router.get("/bill/:orderId", identifyTenant, protect, generateBill);

module.exports = router;
