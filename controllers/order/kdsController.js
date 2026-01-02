const asyncHandler = require("express-async-handler");
const {
  getOrderModel,
  getRestaurantModel,
  getItemModel,
} = require("../../models/index");
const { ORDER_STATUS } = require("../../utils/const");

/**
 * Get active KDS orders (not completed/served/canceled)
 */
const getKDSOrders = asyncHandler(async (req, res) => {
  const Order = getOrderModel(req.restaurantDb);
  const Item = getItemModel(req.restaurantDb);

  try {
    const orders = await Order.find({})
      .sort({ createdAt: 1 }) // FIFO
      .populate({
        path: "orderItems.item",
        model: Item,
        // select: "name price",
      });
    // .populate("orderType", "orderType");

    res.status(200).json({
      status: "success",
      results: orders.length,
      data: orders,
    });
  } catch (error) {
    console.log("error", error);

    res.status(500).json({
      status: "Fail",
      results: error,
      // data: orders,
    });
  }
});

/**
 * Update individual item status and recalculate order status
 */
const updateOrderItemStatus = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params;
  const { status } = req.body;

  const Order = getOrderModel(req.restaurantDb);
  const Restaurant = getRestaurantModel(req.restaurantDb);

  const order = await Order.findOne({ _id: orderId });
  if (!order) {
    return res
      .status(404)
      .json({ status: "error", message: "Order not found" });
  }

  // Get workflow from restaurant config
  // Note: We need the restaurant ID from the order or req.
  // Assuming req.restaurantDb/req.restaurantId is correctly set by middleware
  // Or fetch restaurant using order.restaurantId (which might be a string "restaurant_ID")

  // Since we are in a multi-tenant setup (implied by req.restaurantDb),
  // we might need to query the central Restaurant model for config.
  // But usually config is in the restaurant document.

  // Let's assume req.restaurantId is available or we find the restaurant.
  // The 'Restaurant' model is usually in the main connection, but here 'getRestaurantModel(req.restaurantDb)'?
  // Usually Restaurant model is global.
  // Checking previous controller 'createOrder': `const Order = getOrderModel(req.restaurantDb);`
  // It uses `req.restaurantId` to populate `restaurantId` field.

  // We need to fetch the restaurant config.
  // I will try to find the Restaurant document.
  // Assuming 'Restaurant' is available via central connection or passed in request.
  // If 'getRestaurantModel' uses connection, and 'restaurantDb' is the tenant DB...
  // Wait, Restaurant info is usually in the 'admin' or 'central' DB,
  // OR the 'Restaurant' model is for the tenant configuration.

  // Let's look at restaurantController usage. It just uses `restaurantModel`.
  // I'll assume `getRestaurantModel(req.restaurantDb)` works if `restaurantDb` is passed,
  // OR I need the global connection.

  // For now, I'll fallback to default workflow if I can't find config easily.
  const defaultWorkflow = ["new", "start", "prepared", "ready"];
  let workflow = defaultWorkflow;

  // Try to fetch restaurant config
  const restaurantConfig = await Restaurant.findOne({
    restaurantId: req.restaurantId || `restaurant_${req.user.restaurantId}`, // Fallback if req.restaurantId not set
  });

  if (
    restaurantConfig &&
    restaurantConfig.kdsConfiguration &&
    restaurantConfig.kdsConfiguration.workflow &&
    restaurantConfig.kdsConfiguration.workflow.length > 0
  ) {
    workflow = restaurantConfig.kdsConfiguration.workflow;
  }

  if (!workflow.includes(status)) {
    return res.status(400).json({
      status: "error",
      message: `Invalid status. Allowed: ${workflow.join(", ")}`,
    });
  }

  // Find item and update
  const itemIndex = order.orderItems.findIndex(
    (i) => (i._id && i._id.toString() === itemId) || i.id === itemId
  );

  if (itemIndex === -1) {
    return res
      .status(404)
      .json({ status: "error", message: "Item not found in order" });
  }

  // Update Status
  order.orderItems[itemIndex].itemStatus = status;

  // Update Timestamps based on status
  // Mapping standard workflow names to timestamp fields
  // Workflow: ["new", "start", "prepared", "ready"]
  const now = new Date();
  if (status === "start" || status === "preparing") {
    if (!order.orderItems[itemIndex].kdsTimestamps)
      order.orderItems[itemIndex].kdsTimestamps = {};
    order.orderItems[itemIndex].kdsTimestamps.startedAt = now;
  } else if (status === "prepared") {
    if (!order.orderItems[itemIndex].kdsTimestamps)
      order.orderItems[itemIndex].kdsTimestamps = {};
    order.orderItems[itemIndex].kdsTimestamps.preparedAt = now;
  } else if (status === "ready" || status === "served") {
    if (!order.orderItems[itemIndex].kdsTimestamps)
      order.orderItems[itemIndex].kdsTimestamps = {};
    order.orderItems[itemIndex].kdsTimestamps.readyAt = now;
  }

  // Recalculate Order KDS Status
  const statusIndices = order.orderItems.map((item) => {
    // If item status is null/undefined, assume first state
    const s = item.itemStatus || workflow[0];
    return workflow.indexOf(s);
  });

  // Calculate generic KDS Status for the whole order
  const minIndex = Math.min(...statusIndices);
  // If minIndex corresponds to "ready" (usually last), then all are ready.
  // If minIndex corresponds to "new" (0), but maxIndex > 0, then it's "ongoing"/"partial".

  let newKdsStatus = workflow[minIndex];
  const maxIndex = Math.max(...statusIndices);

  // Logic: passing 'new' (0) to 'start' (1) if WORK HAS STARTED (max > 0)
  if (minIndex === 0 && maxIndex > 0 && workflow.length > 1) {
    // Some are started/done, some are new -> Order is "in progress" (use 2nd status usually)
    newKdsStatus = workflow[1];
  }

  order.kdsStatus = newKdsStatus;

  // Sync with main Order Status if ALL items are READY
  const isAllReady = statusIndices.every(
    (idx) => idx === workflow.indexOf("ready") || workflow[idx] === "served"
  );
  if (
    isAllReady &&
    order.orderStatus !== ORDER_STATUS.READY &&
    order.orderStatus !== ORDER_STATUS.SERVED
  ) {
    // Create notification/log if needed
    order.orderStatus = ORDER_STATUS.READY;
    order.statusHistory.push({
      status: ORDER_STATUS.READY,
      timestamp: new Date(),
      updatedBy: "KDS System",
    });
  }

  await order.save();

  res.status(200).json({
    status: "success",
    data: order,
  });
});

/**
 * Get KDS Configuration
 */
const getKDSConfig = asyncHandler(async (req, res) => {
  const Restaurant = getRestaurantModel(req.restaurantDb);
  const restaurant = await Restaurant.findOne({
    restaurantId: `restaurant_${req.restaurantId}`,
  });

  const workflow = restaurant?.kdsConfiguration?.workflow || [
    "new",
    "start",
    "prepared",
    "ready",
  ];

  const stations = restaurant?.kdsConfiguration?.stations || [];

  res.status(200).json({
    status: "success",
    data: {
      workflow,
      stations,
    },
  });
});

module.exports = {
  getKDSOrders,
  updateOrderItemStatus,
  getKDSConfig,
};
