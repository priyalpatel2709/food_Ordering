const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const mongoSanitize = require("express-mongo-sanitize");
const hpp = require("hpp");
const cors = require("cors");
const { RATE_LIMITS } = require("../utils/const");
const { logger } = require("./loggingMiddleware");

// General API rate limiting
const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.API_WINDOW_MS,
  max: RATE_LIMITS.API_MAX_REQUESTS,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MS,
  max: RATE_LIMITS.AUTH_MAX_REQUESTS,
  skipSuccessfulRequests: true,
  message: "Too many authentication attempts, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});

// Security Middleware Configuration
const securityMiddleware = (app) => {
  // Set security HTTP headers
  app.use(helmet());

  // General API rate limiting
  app.use("/api", apiLimiter);

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Prevent parameter pollution
  app.use(hpp());

  // CORS configuration with safe defaults
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",");

  if (!allowedOrigins || allowedOrigins.length === 0) {
    logger.warn(
      "ALLOWED_ORIGINS not configured - using default localhost for development"
    );
  }

  app.use(
    cors({
      origin: allowedOrigins || [
        "http://localhost:3000",
        "http://localhost:2580",
        "http://10.0.2.2:2580",
      ],
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      credentials: true,
      optionsSuccessStatus: 200,
    })
  );

  // Set additional security headers
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("X-XSS-Protection", "1; mode=block");
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
    next();
  });
};

module.exports = { securityMiddleware, authLimiter };
