const express = require("express");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");
// const compression = require("compression");

// Load environment variables first
dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'MONGO_URI', 'NODE_ENV'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`❌ Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please create a .env file with the required variables');
  process.exit(1);
}

const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const { securityMiddleware } = require("./middleware/securityMiddleware");
const { logger, requestLogger, errorLogger } = require("./middleware/loggingMiddleware");
const { closeAllConnections, getConnectionCount } = require("./config/db");
const { DEFAULTS } = require("./utils/const");

const {
  userRouters,
  restaurantRouters,
  discountRouters,
  taxRouters,
  customizationOptionRoute,
  categoryRoute,
  itemRoute,
  menuRoute,
  orderRoutes,
  orderTypeRoutes,
  paymentRoutes,
  menuRouteV2,
} = require("./routes");

const app = express();

// Apply compression
// app.use(compression());

// Apply security middleware
securityMiddleware(app);

// Apply logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: DEFAULTS.BODY_LIMIT }));
app.use(express.urlencoded({ extended: true, limit: DEFAULTS.BODY_LIMIT }));
app.use(cookieParser());

// Remove x-powered-by header
app.disable("x-powered-by");

const PORT = process.env.PORT || 2580;

// Enhanced health check endpoint
app.get("/health", async (req, res) => {
  const health = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    database: {
      activeConnections: getConnectionCount()
    }
  };

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

// API routes - V1
app.use("/api/v1/user", userRouters);
app.use("/api/v1/restaurant", restaurantRouters);
app.use("/api/v1/discount", discountRouters);
app.use("/api/v1/tax", taxRouters);
app.use("/api/v1/customizationOption", customizationOptionRoute);
app.use("/api/v1/category", categoryRoute);
app.use("/api/v1/item", itemRoute);
app.use("/api/v1/menu", menuRoute);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/orderType", orderTypeRoutes);
app.use("/api/v1/payment", paymentRoutes);

// API routes - V2
app.use("/api/v2/menu", menuRouteV2);

// Error handling middleware
app.use(errorLogger);
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(`✅ Server is running on http://localhost:${PORT}`.green);
  console.log(`📝 Environment: ${process.env.NODE_ENV}`.cyan);
});

// Graceful shutdown handler
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);
  console.log(`\n${signal} received. Shutting down gracefully...`.yellow);

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed');
    console.log('✅ HTTP server closed'.green);

    try {
      // Close all database connections
      await closeAllConnections();
      console.log('✅ All database connections closed'.green);
      logger.info('Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      logger.error('Error during shutdown:', error);
      console.error('❌ Error during shutdown:', error.message);
      process.exit(1);
    }
  });

  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    console.error('❌ Forced shutdown - timeout exceeded'.red);
    process.exit(1);
  }, DEFAULTS.SHUTDOWN_TIMEOUT_MS);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  console.error("❌ UNHANDLED REJECTION! 💥 Shutting down...".red);
  console.error(err);
  
  server.close(async () => {
    try {
      await closeAllConnections();
      process.exit(1);
    } catch (error) {
      logger.error('Error closing connections during unhandled rejection:', error);
      process.exit(1);
    }
  });
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down...', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  console.error("❌ UNCAUGHT EXCEPTION! 💥 Shutting down...".red);
  console.error(err);
  process.exit(1);
});

module.exports = app;
