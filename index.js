const express = require("express");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const cookieParser = require("cookie-parser");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");
const securityMiddleware = require("./middleware/securityMiddleware");
const {
  requestLogger,
  errorLogger,
} = require("./middleware/loggingMiddleware");
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
} = require("./routes");

// Load environment variables
dotenv.config();

const app = express();

// Apply security middleware
securityMiddleware(app);

// Apply logging middleware
app.use(requestLogger);

// Body parsing middleware
app.use(express.json({ limit: "10kb" })); // Limit body size
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(cookieParser());

// Remove x-powered-by header
app.disable("x-powered-by");

const PORT = process.env.PORT || 2580;

// Health check endpoint
app.get("/health", (req, resp) => {
  resp.status(200).json({
    status: "success",
    message: "Server is healthy and running",
    timestamp: new Date().toISOString(),
  });
});

// API routes
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

// Error handling
app.use(errorLogger); // Add error logging before error handling
app.use(notFound);
app.use(errorHandler);

// Graceful shutdown handling
process.on("SIGTERM", () => {
  console.log("SIGTERM received. Shutting down gracefully");
  server.close(() => {
    console.log("Process terminated");
    process.exit(0);
  });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on PORT http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.log("UNHANDLED REJECTION! 💥 Shutting down...");
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});
