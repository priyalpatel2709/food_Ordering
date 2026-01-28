const asyncHandler = require("express-async-handler");
const crudOperations = require("../../../utils/crudOperations");
const { getOrderModel, getRefundModel } = require("../../../models/index");
const { tr } = require("date-fns/locale");
const {
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  ORDER_STATUS,
  PAYMENT_METHODS,
} = require("../../../utils/const");

const giveRefund = asyncHandler(async (req, res, next) => {
  try {
    const Order = getOrderModel(req.restaurantDb);
    const Refund = getRefundModel(req.restaurantDb);

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
          2,
        )}`,
      });
    }

    const newRefundData = {
      amount: refundAmount,
      reason: reason || "Not provided",
      processedBy: req.user._id,
      orderId: order._id,
    };

    const newRefund = new Refund(newRefundData);
    const savedRefund = await newRefund.save();

    // console.log('File: paymentController.js', 'Line 61:', savedRefund);

    // Safely update refund record
    order.refunds = {
      history: [...previousRefunds, savedRefund._id],
      remainingCharge: remainingCharge - refundAmount,
    };

    order.payment.paymentStatus = PAYMENT_STATUS.REFUNDED;

    await order.save();

    res.status(200).json({
      status: "success",
      message: "Refund processed successfully",
      data: {
        refundedAmount: refundAmount,
        totalRefunded: totalRefunded + refundAmount,
        remainingCharge: order.refunds.remainingCharge,
        refundDetails: newRefundData,
      },
    });
  } catch (error) {
    console.error(
      `Refund creation error (orderId: ${req.params.orderId}):`,
      error,
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
      !Object.values(PAYMENT_METHODS).includes(method)
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
      status: TRANSACTION_STATUS.COMPLETE,
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
      0,
    );

    // Optionally update order status
    if (order.payment.balanceDue <= 0) {
      order.payment.paymentStatus = PAYMENT_STATUS.PAID;
      order.payment.balanceDue = 0; // Ensure no negative balance
      order.orderStatus = ORDER_STATUS.COMPLETED; // Or COMPLETED if that's the flow
    } else {
      order.payment.paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
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
      error,
    );
    res.status(500).json({
      status: "error",
      message: "Failed to process payment. Please try again.",
    });
  }
});

const applyDiscount = asyncHandler(async (req, res, next) => {
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

    const { discountAmount } = req.body;

    if (!discountAmount || isNaN(discountAmount) || discountAmount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Invalid discount amount",
      });
    }

    const discountEntry = {
      amount: Number(discountAmount),
      processedAt: new Date(),
      processedBy: req.user?._id || null,
    };

    // Push new discount to history
    order.discountHistory = order.discountHistory || [];
    order.discountHistory.push(discountEntry);

    // Update totalDiscount
    order.totalDiscount += Number(discountAmount);

    await order.save();

    res.status(200).json({
      status: "success",
      message: "Discount applied successfully",
      data: {
        totalDiscount: order.totalDiscount,
        discountHistory: order.discountHistory,
      },
    });
  } catch (error) {
    console.error(
      `Discount application error (orderId: ${req.params.orderId}):`,
      error,
    );
    res.status(500).json({
      status: "error",
      message: "Failed to apply discount. Please try again.",
    });
  }
});

const payForItem = asyncHandler(async (req, res) => {
  const Order = getOrderModel(req.restaurantDb);
  const { orderId, itemIndex, amount, method } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    return res
      .status(404)
      .json({ status: "error", message: "Order not found" });
  }

  if (!order.orderItems[itemIndex]) {
    return res
      .status(400)
      .json({ status: "error", message: "Item not found in order" });
  }

  const item = order.orderItems[itemIndex];
  const remainingItemBalance = item.price * item.quantity - item.paidAmount;

  if (amount > remainingItemBalance) {
    return res.status(400).json({
      status: "error",
      message: `Amount exceeds remaining item balance of ${remainingItemBalance}`,
    });
  }

  item.paidAmount += Number(amount);
  if (item.paidAmount >= item.price * item.quantity) {
    item.isFullyPaid = true;
  }

  const paymentEntry = {
    method: method || PAYMENT_METHODS.CASH,
    amount: Number(amount),
    status: TRANSACTION_STATUS.COMPLETE,
    processedAt: new Date(),
    processedBy: req.user?._id,
    notes: `Item-wise payment for ${itemIndex}`,
  };

  order.payment.history.push(paymentEntry);
  order.payment.totalPaid += Number(amount);
  order.payment.balanceDue = Math.max(
    order.orderFinalCharge - order.payment.totalPaid,
    0,
  );

  if (order.payment.balanceDue <= 0) {
    order.payment.paymentStatus = PAYMENT_STATUS.PAID;
    order.payment.balanceDue = 0;
  } else {
    order.payment.paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
  }

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Item payment processed",
    data: {
      itemPaidAmount: item.paidAmount,
      isFullyPaid: item.isFullyPaid,
      totalPaid: order.payment.totalPaid,
      balanceDue: order.payment.balanceDue,
    },
  });
});

const generateBill = asyncHandler(async (req, res) => {
  const Order = getOrderModel(req.restaurantDb);
  const orderId = req.params.orderId;

  const order = await Order.findById(orderId).populate("orderItems.item");
  if (!order) {
    return res
      .status(404)
      .json({ status: "error", message: "Order not found" });
  }

  // This would typically return a formatted JSON that the frontend uses to render a bill page
  // Or we could trigger a PDF generation here if needed.
  res.status(200).json({
    status: "success",
    data: {
      orderId: order.orderId,
      items: order.orderItems,
      subtotal: order.subtotal,
      tax: order.tax,
      discount: order.discount,
      total: order.orderFinalCharge,
      paid: order.payment.totalPaid,
      balance: order.payment.balanceDue,
      status: order.payment.paymentStatus,
    },
  });
});

module.exports = {
  giveRefund,
  processPayment,
  applyDiscount,
  payForItem,
  generateBill,
};
