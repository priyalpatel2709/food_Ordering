const cron = require("node-cron");
const { getOrderModel } = require("../models/index");
const { ORDER_STATUS } = require("../utils/const");
const { logger } = require("../middleware/loggingMiddleware");
const { getIO } = require("./realtimeService");

// Store active cron jobs
const activeJobs = new Map();

/**
 * Process scheduled orders that are due
 * This function runs every minute to check for orders that should be sent to KDS
 */
const processScheduledOrders = async (restaurantDb, restaurantId) => {
    try {
        const Order = getOrderModel(restaurantDb);
        const now = new Date();

        // Find all scheduled orders that are due and haven't been processed
        const dueOrders = await Order.find({
            isScheduledOrder: true,
            scheduledOrderStatus: "pending",
            scheduledTime: { $lte: now },
            orderStatus: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED] },
        }).populate("orderItems.item");

        if (dueOrders.length === 0) {
            return;
        }

        logger.info(
            `Processing ${dueOrders.length} scheduled orders for restaurant ${restaurantId}`
        );

        for (const order of dueOrders) {
            try {
                // Update order status to preparing (sent to KDS)
                order.orderStatus = ORDER_STATUS.PREPARING;
                order.scheduledOrderStatus = "sent_to_kds";
                order.preparationStartTime = new Date();

                // Update status history
                order.statusHistory.push({
                    status: ORDER_STATUS.PREPARING,
                    timestamp: new Date(),
                    updatedBy: "Scheduler System",
                });

                // Set KDS status for all items
                order.orderItems.forEach((item) => {
                    if (!item.itemStatus || item.itemStatus === "new") {
                        item.itemStatus = "new"; // Mark as new in KDS
                    }
                });

                await order.save();

                // Emit real-time event to KDS
                const io = getIO();
                if (io) {
                    io.to(`restaurant_${restaurantId}`).emit("scheduled_order_ready", {
                        orderId: order._id,
                        orderNumber: order.orderId,
                        scheduledTime: order.scheduledTime,
                        items: order.orderItems,
                        message: "Scheduled order is ready for preparation",
                    });

                    // Also emit to printer room if needed
                    io.to(`restaurant_${restaurantId}_printer`).emit("print_order", {
                        orderId: order._id,
                        orderNumber: order.orderId,
                        items: order.orderItems,
                        orderType: "scheduled",
                    });
                }

                logger.info(
                    `Scheduled order ${order.orderId} sent to KDS for restaurant ${restaurantId}`
                );
            } catch (error) {
                logger.error(
                    `Error processing scheduled order ${order.orderId}:`,
                    error
                );

                // Mark as failed
                order.scheduledOrderStatus = "failed";
                await order.save();
            }
        }
    } catch (error) {
        logger.error(
            `Error in processScheduledOrders for restaurant ${restaurantId}:`,
            error
        );
    }
};

/**
 * Start scheduler for a specific restaurant
 */
const startSchedulerForRestaurant = (restaurantDb, restaurantId) => {
    const jobKey = `restaurant_${restaurantId}`;

    // Don't create duplicate jobs
    if (activeJobs.has(jobKey)) {
        logger.info(`Scheduler already running for ${jobKey}`);
        return;
    }

    // Run every minute
    const job = cron.schedule("* * * * *", async () => {
        await processScheduledOrders(restaurantDb, restaurantId);
    });

    activeJobs.set(jobKey, job);
    logger.info(`Scheduler started for ${jobKey}`);
};

/**
 * Stop scheduler for a specific restaurant
 */
const stopSchedulerForRestaurant = (restaurantId) => {
    const jobKey = `restaurant_${restaurantId}`;
    const job = activeJobs.get(jobKey);

    if (job) {
        job.stop();
        activeJobs.delete(jobKey);
        logger.info(`Scheduler stopped for ${jobKey}`);
    }
};

/**
 * Stop all schedulers
 */
const stopAllSchedulers = () => {
    activeJobs.forEach((job, key) => {
        job.stop();
        logger.info(`Scheduler stopped for ${key}`);
    });
    activeJobs.clear();
};

/**
 * Get active scheduler count
 */
const getActiveSchedulerCount = () => {
    return activeJobs.size;
};

/**
 * Manually trigger scheduled order processing (for testing)
 */
const triggerScheduledOrderProcessing = async (restaurantDb, restaurantId) => {
    logger.info(`Manually triggering scheduled order processing for ${restaurantId}`);
    await processScheduledOrders(restaurantDb, restaurantId);
};

module.exports = {
    startSchedulerForRestaurant,
    stopSchedulerForRestaurant,
    stopAllSchedulers,
    getActiveSchedulerCount,
    triggerScheduledOrderProcessing,
    processScheduledOrders,
};
