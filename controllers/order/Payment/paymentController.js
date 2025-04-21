const asyncHandler = require("express-async-handler");
const crudOperations = require("../../../utils/crudOperations");
const { getOrderModel } = require("../../../models/index");

const giveRefund = asyncHandler(async (req, res, next) => {
  try {
    const Order = getOrderModel(req.restaurantDb);

    const orderId = req.params.orderId;
    const { amount, reason } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Refund amount must be a positive number",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const refundAmount = Number(amount);
    const previousRefunds = order.refunds?.history || [];

    const totalRefunded = previousRefunds.reduce((sum, r) => sum + r.amount, 0);
    const remainingCharge = order.orderFinalCharge - totalRefunded;

    if (refundAmount > remainingCharge) {
      return res.status(400).json({
        status: "error",
        message: `Refund amount exceeds remaining refundable amount of $${remainingCharge.toFixed(
          2
        )}`,
      });
    }

    const newRefund = {
      amount: refundAmount,
      reason: reason || "Not provided",
      processedBy: req.user._id,
      processedAt: new Date(),
    };

    // Safely update refund record
    order.refunds = {
      history: [...previousRefunds, newRefund],
      remainingCharge: remainingCharge - refundAmount,
    };

    await order.save();

    res.status(200).json({
      status: "success",
      message: "Refund processed successfully",
      data: {
        refundedAmount: refundAmount,
        totalRefunded: totalRefunded + refundAmount,
        remainingCharge: order.refunds.remainingCharge,
        refundDetails: newRefund,
      },
    });
  } catch (error) {
    console.error(
      `Refund creation error (orderId: ${req.params.orderId}):`,
      error
    );

    res.status(500).json({
      status: "error",
      message: "An unexpected error occurred while processing the refund.",
    });
  }
});

module.exports = {
  giveRefund,
};
