const express = require("express");
const router = express.Router();
const { identifyTenant, protect } = require("../../middleware/index");
const {
  scanTableQRCode,
  getTableMenu,
  getActiveTableOrder,
} = require("../../controllers/order/customerDineInController");
const {
  joinGroupSession,
  addItemToGroupCart,
  updateGroupCartItem,
  submitGroupOrder,
} = require("../../controllers/order/groupOrderController");

// Public Routes (Accessible after scanning QR)
router.get("/scan", identifyTenant, scanTableQRCode);
router.get("/menu", identifyTenant, getTableMenu);
router.get("/order/:orderId", identifyTenant, getActiveTableOrder);

// Protected Routes (Requires login to participate in ordering)
router.get("/group/join", identifyTenant, protect, joinGroupSession);
router.post("/group/:orderId/add", identifyTenant, protect, addItemToGroupCart);
router.patch(
  "/group/:orderId/item/:itemId",
  identifyTenant,
  protect,
  updateGroupCartItem,
);
router.post(
  "/group/:orderId/submit",
  identifyTenant,
  protect,
  submitGroupOrder,
);

module.exports = router;
