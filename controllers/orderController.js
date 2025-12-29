const getOrderModel = require("../models/order/orderModel");
const getItemModel = require("../models/menu/itemModel");
const { logger } = require("../middleware/loggingMiddleware");
const {
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  HTTP_STATUS,
} = require("../utils/const");

/**
 * Create new order
 */
exports.createOrder = async (req, res) => {
  try {
    const Order = getOrderModel(req.restaurantDb);
    const orderData = req.body;

    // Create the order
    const order = new Order({
      ...orderData,
      customerId: req.user._id,
    });

    await order.save();

    // Populate necessary fields
    await order.populate([
      { path: "customerId", select: "name email phone" },
      { path: "orderItems.item", select: "name price" },
    ]);

    logger.info("Order created successfully", {
      orderId: order.orderId,
      customerId: req.user._id,
      restaurantId: req.restaurantId,
    });

    res.status(HTTP_STATUS.CREATED).json({
      status: "success",
      data: {
        order,
      },
    });
  } catch (error) {
    logger.error("Error creating order:", {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Error creating order",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * Get all orders for a user
 */
exports.getUserOrders = async (req, res) => {
  try {
    const Order = getOrderModel(req.restaurantDb);

    const orders = await Order.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate([{ path: "orderItems.item", select: "name price" }]);

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      results: orders.length,
      data: {
        orders,
      },
    });
  } catch (error) {
    logger.error("Error fetching user orders:", {
      error: error.message,
      userId: req.user._id,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Error fetching orders",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * Get specific order details
 */
exports.getOrderDetails = async (req, res) => {
  try {
    const Order = getOrderModel(req.restaurantDb);

    const order = await Order.findById(req.params.orderId).populate([
      { path: "customerId", select: "name email phone" },
      { path: "orderItems.item", select: "name price description" },
      { path: "discount.discounts.discountId" },
      { path: "tax.taxes.taxId" },
    ]);

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: "error",
        message: "Order not found",
      });
    }

    // Check if the user is authorized to view this order
    if (
      order.customerId._id.toString() !== req.user._id.toString() &&
      req.user.roleName !== "admin"
    ) {
      logger.warn("Unauthorized order access attempt", {
        orderId: req.params.orderId,
        userId: req.user._id,
      });
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: "error",
        message: "Not authorized to view this order",
      });
    }

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      data: {
        order,
      },
    });
  } catch (error) {
    logger.error("Error fetching order details:", {
      error: error.message,
      orderId: req.params.orderId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Error fetching order details",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * Update order status
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const Order = getOrderModel(req.restaurantDb);
    const { status } = req.body;
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: "error",
        message: "Order not found",
      });
    }

    // Validate status transition
    const validTransitions = ORDER_STATUS_TRANSITIONS[order.orderStatus];
    if (!validTransitions.includes(status)) {
      logger.warn("Invalid order status transition attempt", {
        orderId: order.orderId,
        currentStatus: order.orderStatus,
        attemptedStatus: status,
      });
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: `Invalid status transition from ${order.orderStatus} to ${status}`,
      });
    }

    // Update status
    order.orderStatus = status;

    // Add to status history
    order.statusHistory.push({
      status: status,
      timestamp: new Date(),
      updatedBy: req.user.name || req.user.email,
    });

    // Set delivery time if delivered
    if (status === ORDER_STATUS.DELIVERED) {
      order.actualDeliveryTime = new Date();
    }

    await order.save();

    logger.info("Order status updated", {
      orderId: order.orderId,
      newStatus: status,
      updatedBy: req.user._id,
    });

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      data: {
        order,
      },
    });
  } catch (error) {
    logger.error("Error updating order status:", {
      error: error.message,
      orderId: req.params.orderId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Error updating order status",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * Cancel order
 */
exports.cancelOrder = async (req, res) => {
  try {
    const Order = getOrderModel(req.restaurantDb);
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: "error",
        message: "Order not found",
      });
    }

    // Check if order can be cancelled
    const cancellableStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];
    if (!cancellableStatuses.includes(order.orderStatus)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "Order cannot be cancelled at this stage",
      });
    }

    order.orderStatus = ORDER_STATUS.CANCELED;
    order.statusHistory.push({
      status: ORDER_STATUS.CANCELED,
      timestamp: new Date(),
      updatedBy: req.user.name || req.user.email,
    });

    await order.save();

    logger.info("Order cancelled", {
      orderId: order.orderId,
      cancelledBy: req.user._id,
    });

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      message: "Order cancelled successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    logger.error("Error cancelling order:", {
      error: error.message,
      orderId: req.params.orderId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Error cancelling order",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};

/**
 * Track order
 */
exports.trackOrder = async (req, res) => {
  try {
    const Order = getOrderModel(req.restaurantDb);

    const order = await Order.findById(req.params.orderId).select(
      "orderStatus estimatedDeliveryTime actualDeliveryTime createdAt orderItems restaurantId orderId"
    );

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: "error",
        message: "Order not found",
      });
    }

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      data: {
        order,
        tracking: {
          orderId: order.orderId,
          status: order.orderStatus,
          estimatedDeliveryTime: order.estimatedDeliveryTime,
          actualDeliveryTime: order.actualDeliveryTime,
          orderPlacedAt: order.createdAt,
        },
      },
    });
  } catch (error) {
    logger.error("Error tracking order:", {
      error: error.message,
      orderId: req.params.orderId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Error tracking order",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
};
