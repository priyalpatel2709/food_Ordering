const asyncHandler = require("express-async-handler");
const crudOperations = require("../../../utils/crudOperations");
const { getOrderModel } = require("../../../models/index");
const { tr } = require("date-fns/locale");

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

    if (order.payment.totalPaid === 0) {
      return res.status(400).json({
        status: "error",
        message: "Only paid orders can be refunded",
      });
    }

    const refundAmount = Number(amount);
    const previousRefunds = order.refunds?.history || [];

    const totalRefunded = previousRefunds.reduce((sum, r) => sum + r.amount, 0);
    const remainingCharge = order.payment.totalPaid - totalRefunded;

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

    order.payment.paymentStatus = "refunded";

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

const processPayment = asyncHandler(async (req, res, next) => {
  try {
    const Order = getOrderModel(req.restaurantDb);
    const orderId = req.params.orderId;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: "error",
        message: "Order not found",
      });
    }

    const { method, amount, transactionId, gateway, notes } = req.body;

    if (
      !method ||
      !["credit", "debit", "cash", "online", "wallet", "upi"].includes(method)
    ) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or missing payment method",
      });
    }

    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid payment amount",
      });
    }

    const paymentEntry = {
      method,
      transactionId: transactionId || null,
      status: "complete",
      amount: Number(amount),
      processedAt: new Date(),
      processedBy: req.user?._id || null,
      gateway: gateway || null,
      notes: notes || "",
    };

    // Push new payment to history
    order.payment = order.payment || {
      history: [],
      totalPaid: 0,
      balanceDue: 0,
    };
    order.payment.history.push(paymentEntry);

    // Update totalPaid and balanceDue
    order.payment.totalPaid += Number(amount);
    order.payment.balanceDue = Math.max(
      order.orderFinalCharge - order.payment.totalPaid,
      0
    );

    // Optionally update order status
    if (order.payment.balanceDue === 0) {
      order.payment.paymentStatus = "paid";
    } else {
      order.payment.paymentStatus = "partially_paid";
    }

    await order.save();

    res.status(200).json({
      status: "success",
      message: "Payment processed successfully",
      data: {
        totalPaid: order.payment.totalPaid,
        balanceDue: order.payment.balanceDue,
        paymentHistory: order.payment.history,
        orderStatus: order.orderStatus,
      },
    });
  } catch (error) {
    console.error(
      `Payment processing error (orderId: ${req.params.orderId}):`,
      error
    );
    res.status(500).json({
      status: "error",
      message: "Failed to process payment. Please try again.",
    });
  }
});

module.exports = {
  giveRefund,
  processPayment,
};
