const mongoose = require("mongoose");
const colors = require("colors");
const { logger } = require("../helper/logger");
const { DB_CONFIG } = require("../utils/const");

const connections = {};

/**
 * Get database URI for a specific restaurant
 * @param {string} restaurantId - The unique identifier for the restaurant
 * @returns {string} The MongoDB connection URI
 */
const getDatabaseUri = (restaurantId) => {
  const template = 'mongodb+srv://priyal:Pp8141513344@priyalmongodb.a8jlmrk.mongodb.net/restaurant_{restaurantId}';
  if (!template) {
    throw new Error("MONGO_URI environment variable is not set");
  }
  return template.replace("{restaurantId}", restaurantId);
};

/**
 * Connect to a restaurant-specific database with proper error handling
 * @param {string} restaurantId - The unique identifier for the restaurant
 * @returns {Promise<mongoose.Connection>} The database connection
 * @throws {Error} If connection fails
 */
const connectToDatabase = async (restaurantId) => {
  // Return existing connection if available
  if (connections[restaurantId]) {
    // Check if connection is still alive
    if (connections[restaurantId].readyState === 1) {
      return connections[restaurantId];
    } else {
      // Remove stale connection
      delete connections[restaurantId];
    }
  }

  try {
    const uri = getDatabaseUri(restaurantId);

    const connection = await mongoose.createConnection(uri, {
      maxPoolSize: DB_CONFIG.MAX_POOL_SIZE,
      minPoolSize: DB_CONFIG.MIN_POOL_SIZE,
      serverSelectionTimeoutMS: DB_CONFIG.SERVER_SELECTION_TIMEOUT_MS,
      socketTimeoutMS: DB_CONFIG.SOCKET_TIMEOUT_MS,
    });

    // Connection event listeners
    connection.on("error", (err) => {
      logger.error(`DB connection error for ${restaurantId}:`, {
        error: err.message,
        stack: err.stack,
      });
    });

    connection.on("disconnected", () => {
      logger.warn(`DB disconnected for ${restaurantId}`);
      delete connections[restaurantId];
    });

    connection.on("reconnected", () => {
      logger.info(`DB reconnected for ${restaurantId}`);
    });

    connection.on("close", () => {
      logger.info(`DB connection closed for ${restaurantId}`);
      delete connections[restaurantId];
    });

    logger.info(`Connected to DB for restaurant ${restaurantId}`.green);
    console.log(
      `Connected to DB for restaurant ${restaurantId}`.underline.bgGreen
    );

    connections[restaurantId] = connection;
    return connection;
  } catch (error) {
    logger.error(`Failed to connect to DB for ${restaurantId}:`, {
      error: error.message,
      stack: error.stack,
    });
    throw new Error(
      `Database connection failed for ${restaurantId}: ${error.message}`
    );
  }
};

/**
 * Close all database connections gracefully
 * @returns {Promise<void>}
 */
const closeAllConnections = async () => {
  const connectionIds = Object.keys(connections);

  if (connectionIds.length === 0) {
    logger.info("No database connections to close");
    return;
  }

  logger.info(`Closing ${connectionIds.length} database connection(s)...`);

  try {
    await Promise.all(
      connectionIds.map(async (id) => {
        try {
          await connections[id].close();
          logger.info(`Closed connection for ${id}`);
        } catch (error) {
          logger.error(`Error closing connection for ${id}:`, error.message);
        }
      })
    );
    logger.info("All database connections closed successfully");
  } catch (error) {
    logger.error("Error during connection cleanup:", error);
    throw error;
  }
};

/**
 * Get all active connections
 * @returns {Object} Object containing all active connections
 */
const getActiveConnections = () => {
  return { ...connections };
};

/**
 * Get connection count
 * @returns {number} Number of active connections
 */
const getConnectionCount = () => {
  return Object.keys(connections).length;
};

module.exports = {
  connectToDatabase,
  closeAllConnections,
  getActiveConnections,
  getConnectionCount,
};
