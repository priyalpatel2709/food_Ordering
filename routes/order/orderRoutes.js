const express = require("express");
const router = express.Router();
const {
  protect,
  identifyTenant,
  validateRequest,
  schemas,
  adminOnly,
  allowedRoles,
  queryHandler,
} = require("../../middleware/index");

const {
  createOrder,
  getAllOrders,
  getOrderById,
  deleteById,
  updateById,
  deleteAll,
  // getOrderDetails,
  // updateOrderStatus,
  // cancelOrder,
  // trackOrder
} = require("../../controllers/order/orderController");

// Create new order
router.post(
  "/",
  validateRequest(schemas.orderCreation),
  identifyTenant,
  protect,
  createOrder
);
router.get(
  "/",
  identifyTenant,
  protect,
  allowedRoles(["manager"]),
  queryHandler,
  getAllOrders
);
router.get("/:id", identifyTenant, protect, queryHandler, getOrderById);
router.delete("/", identifyTenant, protect, allowedRoles(["admin"]), deleteAll);
router.delete(
  "/:id",
  identifyTenant,
  protect,
  allowedRoles(["admin"]),
  deleteById
);
router.put(
  "/:id",
  identifyTenant,
  protect,
  allowedRoles(["manager"]),
  updateById
);

module.exports = router;
