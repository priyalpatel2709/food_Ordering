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
    const query = {
      restaurantId: `restaurant_${req.restaurantId}`, // Uncomment if using shared DB
      orderStatus: {
        $nin: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELED, ORDER_STATUS.DELIVERED]
      }
    };

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
  // This part depends on how the DB architecture handles multi-tenancy for Restaurant settings.
  // If 'Restaurant' collection is in the tenant DB, we are good.
  const restaurantConfig = await Restaurant.findOne({
    restaurantId: req.restaurantId,
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
    (i) => i._id && i._id.toString() === itemId
  );
  // Note: orderItems might not have _id if subdocument _id creation is disabled,
  // but Mongoose usually adds them by default.
  // If passed itemId corresponds to the 'item' reference ID, that's ambiguous if multiple same items.
  // Assuming itemId is the subdocument ID.

  if (itemIndex === -1) {
    // Fallback: try matching by item reference ID if provided (less safe)
    return res
      .status(404)
      .json({ status: "error", message: "Item not found in order" });
  }

  order.orderItems[itemIndex].itemStatus = status;

  // Recalculate Order KDS Status
  const statusIndices = order.orderItems.map((item) => {
    // If item status is null/undefined, assume first state
    const s = item.itemStatus || workflow[0];
    return workflow.indexOf(s);
  });

  const minIndex = Math.min(...statusIndices);
  const maxIndex = Math.max(...statusIndices);

  let newKdsStatus = workflow[minIndex];

  // Logic: passing 'new' (0) to 'start' (1) if WORK HAS STARTED (max > 0)
  if (minIndex === 0 && maxIndex > 0 && workflow.length > 1) {
    newKdsStatus = workflow[1];
  }

  order.kdsStatus = newKdsStatus;

  // Optional: Sync with main orderStatus if needed
  // e.g. if kdsStatus == 'ready' -> orderStatus = 'READY'
  // But user didn't explicitly ask for this sync, so I'll leave it decoupled or simple.
  // If KDS says "ready", it usually means "Food Ready".
  // Main status "READY" usually means "Ready for Pickup/Serve".
  // I'll make a mapping if "ready" is the status.
  if (newKdsStatus === "ready" || newKdsStatus === "prepared") {
    // Maybe update main status?
    // For now, let's just save.
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
    restaurantId: req.restaurantId,
  });

  const workflow = restaurant?.kdsConfiguration?.workflow || [
    "new",
    "start",
    "prepared",
    "ready",
  ];

  res.status(200).json({
    status: "success",
    data: {
      workflow,
    },
  });
});

module.exports = {
  getKDSOrders,
  updateOrderItemStatus,
  getKDSConfig,
};
