const asyncHandler = require("express-async-handler");
const crudOperations = require("../../../utils/crudOperations");
const { getOrderModel } = require("../../../models/index");

const addRefundToOrder = asyncHandler(async (req, res, next) => {
  const { orderId } = req.body || req.params;
  const { refundAmount } = req.body;
  const Order = getOrderModel(req.restaurantDb);

  const order = await Order.findById(orderId);
  console.log("File: refundController.js", "Line 11:", order,orderId,req);
  res.json(order);
});

module.exports = {
  addRefundToOrder,
};
