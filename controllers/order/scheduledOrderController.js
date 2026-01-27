const asyncHandler = require("express-async-handler");
const { getOrderModel } = require("../../models/index");
const { HTTP_STATUS } = require("../../utils/const");
const {
    triggerScheduledOrderProcessing,
} = require("../../services/schedulerService");

/**
 * Get all scheduled orders
 * GET /api/v1/orders/scheduled?status=pending
 */
const getScheduledOrders = asyncHandler(async (req, res) => {
    const { status, startDate, endDate } = req.query;
    const Order = getOrderModel(req.restaurantDb);

    const filter = {
        isScheduledOrder: true,
    };

    if (status) {
        filter.scheduledOrderStatus = status;
    }

    // Date filtering for scheduled time
    if (startDate || endDate) {
        filter.scheduledTime = {};
        if (startDate) filter.scheduledTime.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.scheduledTime.$lte = end;
        }
    }

    const orders = await Order.find(filter)
        .populate("orderItems.item", "name price")
        .populate("customerId", "name email phone")
        .sort({ scheduledTime: 1 });

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        results: orders.length,
        data: orders,
    });
});

/**
 * Update scheduled order time
 * PUT /api/v1/orders/scheduled/:orderId
 */
const updateScheduledOrder = asyncHandler(async (req, res) => {
    const { scheduledTime } = req.body;
    const Order = getOrderModel(req.restaurantDb);

    const order = await Order.findById(req.params.orderId);

    if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: "error",
            message: "Order not found",
        });
    }

    if (!order.isScheduledOrder) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: "error",
            message: "This is not a scheduled order",
        });
    }

    if (order.scheduledOrderStatus === "sent_to_kds") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: "error",
            message: "Cannot update order that has already been sent to KDS",
        });
    }

    const newScheduledTime = new Date(scheduledTime);
    if (newScheduledTime <= new Date()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: "error",
            message: "Scheduled time must be in the future",
        });
    }

    order.scheduledTime = newScheduledTime;
    await order.save();

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        message: "Scheduled time updated successfully",
        data: order,
    });
});

/**
 * Manually trigger scheduled order processing (for testing/admin)
 * POST /api/v1/orders/scheduled/trigger
 */
const manualTriggerScheduled = asyncHandler(async (req, res) => {
    await triggerScheduledOrderProcessing(
        req.restaurantDb,
        req.restaurantId
    );

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        message: "Scheduled order processing triggered",
    });
});

/**
 * Cancel a scheduled order
 * DELETE /api/v1/orders/scheduled/:orderId
 */
const cancelScheduledOrder = asyncHandler(async (req, res) => {
    const Order = getOrderModel(req.restaurantDb);

    const order = await Order.findById(req.params.orderId);

    if (!order) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: "error",
            message: "Order not found",
        });
    }

    if (!order.isScheduledOrder) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: "error",
            message: "This is not a scheduled order",
        });
    }

    if (order.scheduledOrderStatus === "sent_to_kds") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
            status: "error",
            message: "Cannot cancel order that has already been sent to KDS",
        });
    }

    order.orderStatus = "canceled";
    order.scheduledOrderStatus = "failed";
    order.statusHistory.push({
        status: "canceled",
        timestamp: new Date(),
        updatedBy: req.user.name || req.user.email,
    });

    await order.save();

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        message: "Scheduled order cancelled successfully",
        data: order,
    });
});

module.exports = {
    getScheduledOrders,
    updateScheduledOrder,
    manualTriggerScheduled,
    cancelScheduledOrder,
};
