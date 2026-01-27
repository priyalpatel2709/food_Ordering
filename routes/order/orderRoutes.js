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

const { authorize } = require("../../middleware/rbacMiddleware");
const { PERMISSIONS } = require("../../utils/permissions");

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
  cancelOrder,
  // trackOrder
} = require("../../controllers/order/orderController");

const {
  getTablesStatus,
  createDineInOrder,
  addItemsToOrder,
  completeDineInCheckout,
  removeDineInOrder,
  removeOrderItem,
} = require("../../controllers/order/dineInController");

const {
  joinGroupSession,
  addItemToGroupCart,
  updateGroupCartItem,
  submitGroupOrder,
} = require("../../controllers/order/groupOrderController");

const {
  getScheduledOrders,
  updateScheduledOrder,
  manualTriggerScheduled,
  cancelScheduledOrder,
} = require("../../controllers/order/scheduledOrderController");

// Group Ordering Routes
// router.get("/dine-in/group/join", identifyTenant, protect, joinGroupSession);
// router.post("/dine-in/group/:orderId/add", identifyTenant, protect, addItemToGroupCart);
// router.patch("/dine-in/group/:orderId/item/:itemId", identifyTenant, protect, updateGroupCartItem);
// router.post("/dine-in/group/:orderId/submit", identifyTenant, protect, submitGroupOrder);

// Dine-In Routes
router.get(
  "/tables",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_READ),
  getTablesStatus
);
router.post(
  "/dine-in",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_CREATE),
  createDineInOrder
);

router.post(
  "/cancel/:orderId",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_DELETE),
  cancelOrder
);
router.put(
  "/dine-in/:orderId/items",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_UPDATE),
  addItemsToOrder
);
router.post(
  "/dine-in/:orderId/pay",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_UPDATE),
  completeDineInCheckout
);

router.delete(
  "/dine-in/:orderId/item/:itemId",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_UPDATE),
  removeOrderItem
);
router.delete(
  "/dine-in/:orderId",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_DELETE),
  removeDineInOrder
);

// Scheduled Order Routes
router.get(
  "/scheduled",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_READ),
  getScheduledOrders
);

router.put(
  "/scheduled/:orderId",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_UPDATE),
  updateScheduledOrder
);

router.post(
  "/scheduled/trigger",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_UPDATE),
  manualTriggerScheduled
);

router.delete(
  "/scheduled/:orderId",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_DELETE),
  cancelScheduledOrder
);

router.get("/my-orders", identifyTenant, protect, getUserOrders);

// Create order with payment (atomic transaction)
router.post(
  "/create-with-payment",
  validateRequest(schemas.orderWithPayment),
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_CREATE),
  createOrderWithPayment
);

// Create new order (without immediate payment)
router.post(
  "/",
  // validateRequest(schemas.orderCreation),
  identifyTenant,
  protect,
  // authorize(PERMISSIONS.ORDER_CREATE),
  createOrder
);
router.get(
  "/",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_READ),
  queryHandler,
  getAllOrders
);
router.get(
  "/:id",
  identifyTenant,
  protect,
  queryHandler,
  authorize(PERMISSIONS.ORDER_READ),
  getOrderById
);
router.delete(
  "/",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_DELETE),
  deleteAll
);
router.delete(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_DELETE),
  deleteById
);
router.put(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.ORDER_UPDATE),
  updateById
);

module.exports = router;
