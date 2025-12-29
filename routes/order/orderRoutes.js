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
  getUserOrders,
  createOrderWithPayment,
  // getOrderDetails,
  // updateOrderStatus,
  // cancelOrder,
  // trackOrder
} = require("../../controllers/order/orderController");

router.get("/my-orders", identifyTenant, protect, getUserOrders);

// Create order with payment (atomic transaction)
router.post(
  "/create-with-payment",
  validateRequest(schemas.orderWithPayment),
  identifyTenant,
  protect,
  createOrderWithPayment
);

// Create new order (without immediate payment)
router.post(
  "/",
  // validateRequest(schemas.orderCreation),
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
