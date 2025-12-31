const { Server } = require("socket.io");
const { getOrderModel } = require("../models/index");
const { connectToDatabase } = require("../config/db");
const { logger } = require("../middleware/loggingMiddleware");

let io;
const activeStreams = new Map(); // Store change streams per restaurantId

/**
 * Initialize Socket.io and setup listeners
 */
const initSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.on("connection", (socket) => {
        logger.info(`New client connected: ${socket.id}`);

        // Join a restaurant-specific room (for KDS updates)
        socket.on("join_restaurant", async (restaurantId) => {
            socket.join(restaurantId);
            logger.info(`Socket ${socket.id} joined restaurant room: ${restaurantId}`);

            // Start watching database for this restaurant if not already watching
            await setupChangeStream(restaurantId);
        });

        // Join a group ordering room for a specific table
        socket.on("join_group", (data) => {
            const { restaurantId, tableNumber } = data;
            if (!restaurantId || !tableNumber) return;

            const room = `group:${restaurantId}:${tableNumber}`;
            socket.join(room);
            logger.info(`Socket ${socket.id} joined group room: ${room}`);
        });

        socket.on("disconnect", () => {
            logger.info(`Client disconnected: ${socket.id}`);
        });
    });

    return io;
};

/**
 * Emit cart update to a specific group room
 */
const emitGroupCartUpdate = (restaurantId, tableNumber, cartData) => {
    if (!io) return;
    const room = `group:${restaurantId}:${tableNumber}`;
    io.to(room).emit("group_cart_updated", cartData);
    logger.info(`Broadcasted group cart update to room: ${room}`);
};

/**
 * Setup MongoDB Change Stream for a specific restaurant
 */
const setupChangeStream = async (restaurantId) => {
    // If we already have a stream for this restaurant, don't create another
    if (activeStreams.has(restaurantId)) return;

    try {
        const restaurantDb = await connectToDatabase(restaurantId);
        const Order = getOrderModel(restaurantDb);

        logger.info(`Starting Change Stream for restaurant: ${restaurantId}`);

        // Options for the change stream
        const pipeline = [
            {
                $match: {
                    $or: [
                        { "operationType": "insert" },
                        { "operationType": "update" },
                        { "operationType": "replace" }
                    ]
                }
            }
        ];

        const changeStream = Order.watch(pipeline, { fullDocument: "updateLookup" });

        changeStream.on("change", (change) => {
            logger.info(`Change detected in restaurant ${restaurantId}: ${change.operationType}`);

            // Emit the change information to the restaurant's room
            io.to(restaurantId).emit("kds_update", {
                operationType: change.operationType,
                documentKey: change.documentKey,
                fullDocument: change.fullDocument,
                updateDescription: change.updateDescription
            });
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
 * Close all active streams (useful for graceful shutdown)
 */
const closeAllStreams = () => {
    for (const [restaurantId, stream] of activeStreams.entries()) {
        stream.close();
        logger.info(`Closed stream for ${restaurantId}`);
    }
    activeStreams.clear();
};

module.exports = {
    initSocket,
    closeAllStreams,
    emitGroupCartUpdate
};
