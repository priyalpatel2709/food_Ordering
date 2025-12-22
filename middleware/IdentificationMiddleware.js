const { connectToDatabase } = require("../config/db");
const { DEFAULTS } = require("../utils/const");
const { logger } = require("./loggingMiddleware");

/**
 * Identify tenant (restaurant) and establish database connections
 * Supports multi-tenant architecture with separate databases per restaurant
 */
const identifyTenant = async (req, res, next) => {
  let restaurantId =
    req.body.restaurantId ||
    req.header("X-Restaurant-Id") ||
    req.query.restaurantId;

  let isUserRequire =
    req.body.isUserRequire ||
    req.header("X-isUserRequire") ||
    req.query.isUserRequire;

  // Default to "Users" database if no restaurantId is provided and base URL is "/user"
  if (!restaurantId && req.baseUrl === "/api/v1/user") {
    restaurantId = DEFAULTS.RESTAURANT_ID;
  }

  console.log(`restaurantId ${restaurantId}`);

  // Validate restaurantId is provided
  if (!restaurantId) {
    logger.warn("Request without restaurant ID", {
      path: req.path,
      method: req.method,
      ip: req.ip,
    });
    return res.status(400).json({
      status: "error",
      message: "Restaurant ID is required",
    });
  }

  try {
    // Connect to the "Users" database if required
    if (isUserRequire !== "false") {
      req.usersDb = await connectToDatabase(DEFAULTS.RESTAURANT_ID);
    }

    // Connect to the specified restaurant database if restaurantId is not "Users"
    if (restaurantId !== DEFAULTS.RESTAURANT_ID) {
      req.restaurantDb = await connectToDatabase(restaurantId);
    }

    // Store restaurantId in request for later use
    req.restaurantId = restaurantId;

    next();
  } catch (err) {
    logger.error("Database connection error in tenant identification", {
      restaurantId,
      error: err.message,
      stack: err.stack,
    });
    res.status(500).json({
      status: "error",
      message: "Database connection error",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : err.message,
    });
  }
};

module.exports = identifyTenant;
