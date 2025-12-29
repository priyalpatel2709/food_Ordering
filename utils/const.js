/**
 * Application Constants
 * Centralized constants for consistent usage across the application
 */

// User Roles
const USER_ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  CUSTOMER: 'customer',
  STAFF: 'staff',
};

// Order Statuses
const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  SERVED: 'served',
  COMPLETED: 'completed',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  CANCELED: 'canceled',
};

// Valid Order Status Transitions
const ORDER_STATUS_TRANSITIONS = {
  [ORDER_STATUS.PENDING]: [ORDER_STATUS.CONFIRMED, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PREPARING, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.PREPARING]: [ORDER_STATUS.READY, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.READY]: [ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.SERVED, ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.SERVED]: [ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELED], // Dine-in flow
  [ORDER_STATUS.COMPLETED]: [], // Dine-in end
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELED],
  [ORDER_STATUS.DELIVERED]: [],
  [ORDER_STATUS.CANCELED]: []
};

// Payment Statuses
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  PARTIALLY_PAID: 'partially_paid',
  REFUNDED: 'refunded',
  FAILED: 'failed',
};

// Payment Methods
const PAYMENT_METHODS = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  CASH: 'cash',
  ONLINE: 'online',
  WALLET: 'wallet',
  UPI: 'upi',
};

// Payment Transaction Statuses
const TRANSACTION_STATUS = {
  PENDING: 'pending',
  COMPLETE: 'complete',
  FAILED: 'failed',
  REFUNDED: 'refunded',
};

// Address Types
const ADDRESS_TYPES = {
  HOME: 'home',
  WORK: 'work',
  OTHER: 'other',
};

// Gender Options
const GENDER = {
  MALE: 'male',
  FEMALE: 'female',
  OTHER: 'other',
};

// Environment
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  PRODUCTION: 'production',
  TEST: 'test',
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

// Rate Limiting
const RATE_LIMITS = {
  API_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  API_MAX_REQUESTS: 100,
  AUTH_WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  AUTH_MAX_REQUESTS: 5,
};

// Database
const DB_CONFIG = {
  MAX_POOL_SIZE: 10,
  MIN_POOL_SIZE: 2,
  SERVER_SELECTION_TIMEOUT_MS: 5000,
  SOCKET_TIMEOUT_MS: 45000,
};

// Default Values
const DEFAULTS = {
  RESTAURANT_ID: 'Users',
  BCRYPT_SALT_ROUNDS: 10,
  JWT_EXPIRES_IN: '7d',
  BODY_LIMIT: '10kb',
  SHUTDOWN_TIMEOUT_MS: 10000,
};

module.exports = {
  USER_ROLES,
  ORDER_STATUS,
  ORDER_STATUS_TRANSITIONS,
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  TRANSACTION_STATUS,
  ADDRESS_TYPES,
  GENDER,
  ENVIRONMENTS,
  HTTP_STATUS,
  RATE_LIMITS,
  DB_CONFIG,
  DEFAULTS,
};
