const { Server } = require("socket.io");
const { getOrderModel } = require("../models/index");
const { connectToDatabase } = require("../config/db");
const { logger } = require("../middleware/loggingMiddleware");

let io;
const activeStreams = new Map(); // Store change streams per restaurantId

/**
 * Normalizes restaurant ID to be consistent (removes 'restaurant_' prefix if present)
 */
const normalizeId = (id) => {
    if (!id) return id;
    return id.toString().replace("restaurant_", "");
};

/**
 * Gets a consistent room name for a restaurant
 */
const getRestaurantRoom = (id) => `restaurant_${normalizeId(id)}`;

/**
 * Gets a consistent room name for a table
 */
const getTableRoom = (restaurantId, tableNumber) => `table:${getRestaurantRoom(restaurantId)}:${tableNumber}`;

/**
 * Gets a consistent room name for a group
 */
const getGroupRoom = (restaurantId, tableNumber) => `group:${getRestaurantRoom(restaurantId)}:${tableNumber}`;

/**
 * Initialize Socket.io and setup listeners
 */
const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        logger.info(`New client connected: ${socket.id}`);

        // Join a restaurant-specific room (for KDS updates)
        socket.on("join_restaurant", async (restaurantId) => {
            const room = getRestaurantRoom(restaurantId);
            socket.join(room);
            logger.info(
                `Socket ${socket.id} joined restaurant room: ${room}`
            );

            // Start watching database for this restaurant if not already watching
            await setupChangeStream(normalizeId(restaurantId));
        });

        // Join a group ordering room for a specific table
        socket.on("join_group", (data) => {
            const { restaurantId, tableNumber } = data;
            if (!restaurantId || !tableNumber) return;

            const room = getGroupRoom(restaurantId, tableNumber);
            socket.join(room);
            logger.info(`Socket ${socket.id} joined group room: ${room}`);
        });

        // Join a specific table room for detailed updates (Staff Table Details)
        socket.on("join_table", (data) => {
            const { restaurantId, tableNumber } = data;
            if (!restaurantId || !tableNumber) return;

            const room = getTableRoom(restaurantId, tableNumber);
            socket.join(room);
            logger.info(`Socket ${socket.id} joined table room: ${room}`);
        });

        socket.on("disconnect", () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Centralized function to notify all parties of an order update.
 * Emits to both table-specific and group-specific rooms.
 * Uses multiple event names to ensure compatibility with different frontend implementations.
 */
const notifyOrderUpdate = (restaurantId, tableNumber, orderData, operationType = "update") => {
    if (!io || !tableNumber) return;

    const tableRoom = getTableRoom(restaurantId, tableNumber);
    const groupRoom = getGroupRoom(restaurantId, tableNumber);
    const restaurantRoom = getRestaurantRoom(restaurantId);

    const payload = {
        operationType,
        order: orderData,
    };

    // 1. Notify Table Details Room (Staff View)
    io.to(tableRoom).emit("table_order_updated", payload);

    // 2. Notify Group Ordering Room (Customer View & Legacy Staff View)
    io.to(groupRoom).emit("group_cart_updated", orderData); // Legacy format
    io.to(groupRoom).emit("group_order_updated", payload);   // Simplified format

    // 3. Notify Restaurant Room (Grid View Update)
    // We also trigger a status update to ensure the grid stays in sync
    io.to(restaurantRoom).emit("table_status_updated", {
        tableNumber: tableNumber,
        status: orderData.orderStatus,
        orderId: orderData._id,
        amount: orderData.orderFinalCharge,
        itemCount: orderData.totalItemCount || (orderData.orderItems ? orderData.orderItems.length : 0),
        customerName: orderData.contactName || orderData.serverName,
        updatedAt: orderData.updatedAt || new Date()
    });

    logger.info(`Broadcasted order update for Table ${tableNumber} to all rooms.`);
};

/**
 * Setup MongoDB Change Stream for a specific restaurant
 */
const setupChangeStream = async (restaurantIdInput) => {
    const restaurantId = normalizeId(restaurantIdInput);
    if (activeStreams.has(restaurantId)) return;

    try {
        const restaurantDb = await connectToDatabase(restaurantId);
        if (!restaurantDb) return;

        const Order = getOrderModel(restaurantDb);

        logger.info(`Starting Change Stream for restaurant: ${restaurantId}`);

        const pipeline = [
            {
                $match: {
                    $or: [
                        { operationType: "insert" },
                        { operationType: "update" },
                        { operationType: "replace" },
                        { operationType: "delete" }
                    ],
                },
            },
        ];

        const changeStream = Order.watch(pipeline, {
            fullDocument: "updateLookup",
        });

        changeStream.on("change", (change) => {
            logger.info(`Change detected in ${restaurantId}: ${change.operationType}`);
            const restaurantRoom = getRestaurantRoom(restaurantId);

            // Handle Decletions
            if (change.operationType === "delete") {
                io.to(restaurantRoom).emit("order_deleted", {
                    orderId: change.documentKey._id,
                });
                return;
            }

            const fullDoc = change.fullDocument;
            if (!fullDoc) return;

            // 1. Emit KDS update
            io.to(restaurantRoom).emit("kds_update", {
                operationType: change.operationType,
                documentKey: change.documentKey,
                fullDocument: fullDoc,
                updateDescription: change.updateDescription,
            });

            // 2. If it's a Dine-In order, notify table and group rooms
            if (fullDoc.tableNumber) {
                notifyOrderUpdate(restaurantId, fullDoc.tableNumber, fullDoc, change.operationType);
            }
        });

        changeStream.on("error", (error) => {
            logger.error(`Change stream error for ${restaurantId}:`, error);
            activeStreams.delete(restaurantId);
            changeStream.close();
        });

        activeStreams.set(restaurantId, changeStream);
    } catch (error) {
        logger.error(`Failed to setup change stream for ${restaurantId}:`, error);
    }
};

/**
 * Close all active streams
 */
const closeAllStreams = () => {
    for (const [restaurantId, stream] of activeStreams.entries()) {
        stream.close();
    }
    activeStreams.clear();
};

/**
 * Manual trigger for table status update (useful for immediate feedback before change stream)
 */
const emitTableStatusUpdate = (restaurantId, tableNumber, statusData) => {
    if (!io) return;
    const restaurantRoom = getRestaurantRoom(restaurantId);
    io.to(restaurantRoom).emit("table_status_updated", {
        tableNumber,
        ...statusData,
    });
};

/**
 * Get Socket.io instance
 */
const getIO = () => io;

module.exports = {
    initSocket,
    closeAllStreams,
    notifyOrderUpdate,
    emitTableStatusUpdate,
    getIO,
    // Keep legacy exports for compatibility during refactor
    emitGroupCartUpdate: (r, t, c) => notifyOrderUpdate(r, t, c),
    emitTableOrderUpdate: (r, t, o) => notifyOrderUpdate(r, t, o)
};
