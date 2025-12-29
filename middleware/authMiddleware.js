const jwt = require("jsonwebtoken");
const getUserModel = require("../models/user/userModel");
const asyncHandler = require("express-async-handler");
const { logger } = require("./loggingMiddleware");
const { HTTP_STATUS } = require("../utils/const");

/**
 * Protect routes - verify JWT token and attach user to request
 */
const protect = asyncHandler(async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    logger.warn("Authentication attempt without token", {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      status: "error",
      error: "Not authorized, no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = getUserModel(req.usersDb);
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      logger.warn("Token valid but user not found", {
        userId: decoded.id,
        restaurantId: decoded.restaurantId,
        ip: req.ip,
      });
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        status: "error",
        error: "User not found",
      });
    }

    if (!user.isActive) {
      logger.warn("Inactive user attempted access", {
        userId: user._id,
        email: user.email,
      });
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        status: "error",
        error: "Account is inactive",
      });
    }

    req.user = user;

    next();
  } catch (error) {
    logger.warn("Invalid token attempt", {
      error: error.message,
      ip: req.ip,
      path: req.path,
    });
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      status: "error",
      error: "Not authorized, token invalid",
    });
  }
});

module.exports = { protect };
