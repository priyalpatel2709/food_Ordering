const asyncHandler = require("express-async-handler");
const {
  getOrderModel,
  getItemModel,
  getTaxModel,
  getDiscountModel,
} = require("../../../models/index");
const { logger } = require("../../../middleware/loggingMiddleware");
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  HTTP_STATUS,
} = require("../../../utils/const");

/**
 * Create order with immediate payment processing
 * This endpoint handles both order creation and payment in a single atomic transaction
 * @route POST /api/v1/orders/create-with-payment
 */

module.exports = {
  createOrderWithPayment,
};
