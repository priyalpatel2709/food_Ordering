const { v4: uuidv4 } = require('uuid');

/**
 * Request ID Middleware
 * Adds a unique request ID to each request for tracking and logging
 */
const requestIdMiddleware = (req, res, next) => {
  // Use existing request ID from header or generate new one
  req.id = req.headers['x-request-id'] || uuidv4();
  
  // Set response header
  res.setHeader('X-Request-ID', req.id);
  
  next();
};

module.exports = requestIdMiddleware;
