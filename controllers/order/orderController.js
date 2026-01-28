const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const {
  getOrderModel,
  getUserModel,
  getOrderTypeModel,
  getItemModel,
  getTaxModel,
  getDiscountModel,
} = require("../../models/index");
const { getQueryParams } = require("../../utils/utils");
const { logger } = require("../../middleware/loggingMiddleware");
const {
  ORDER_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  HTTP_STATUS,
} = require("../../utils/const");
const { notifyOrderUpdate } = require("../../services/realtimeService");
const { applyLoyaltyDiscount } = require("../../middleware/loyaltyMiddleware");


const createOrder = asyncHandler(async (req, res, next) => {
  try {
    // Get models from database connection
    const Order = getOrderModel(req.restaurantDb);
    const Item = getItemModel(req.restaurantDb);
    const Tax = getTaxModel(req.restaurantDb);
    const Discount = getDiscountModel(req.restaurantDb);

    // Extract data from request body with defaults
    const {
      orderItems: clientOrderItems,
      tax: taxIds = [],
      discount: discountIds = [],
      restaurantTipCharge = 0,
      deliveryCharge = 0,
      deliveryTipCharge = 0,
    } = req.body;

    // Validate request using Joi (assuming you have this middleware)
    // This would replace your manual validation below

    // Basic validation for order items
    if (!clientOrderItems || clientOrderItems.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Order must contain at least one item.",
      });
    }

    // Performance optimization: Collect all item IDs
    const itemIds = clientOrderItems.map((item) => item.item);

    // Batch fetch all items in a single query instead of separate queries
    const itemsMap = {};
    const items = await Item.find({ _id: { $in: itemIds } });
    items.forEach((item) => {
      itemsMap[item._id.toString()] = item;
    });

    // Initialize values
    let subtotal = 0;
    const invalidItems = [];

    // Process order items
    const orderItems = clientOrderItems
      .map((orderItem) => {
        const item = itemsMap[orderItem.item];

        // Handle case where item doesn't exist
        if (!item) {
          invalidItems.push(orderItem.item);
          return null;
        }

        const quantity = parseInt(orderItem.quantity) || 1;
        const price = Number(item.price);

        let modifiersTotal = 0;
        let safeModifiers = [];

        console.log("safeModifiers ", orderItem.customizationOptions);

        if (
          orderItem.customizationOptions &&
          Array.isArray(orderItem.customizationOptions)
        ) {
          safeModifiers = orderItem.customizationOptions.map((m) => ({
            name: m.name ? String(m.name) : "Option",
            price: Number(m.price) || 0,
          }));
          modifiersTotal = safeModifiers.reduce((sum, m) => sum + m.price, 0);
        }

        const discountPrice =
          orderItem.price && orderItem.price !== price
            ? Number(price - orderItem.price)
            : 0;

        // Add to subtotal (price + modifiers) * quantity
        subtotal += (price + modifiersTotal) * quantity;

        console.log(
          "safeModifiers ",
          safeModifiers,
          orderItem.modifiers,
          orderItem,
        );

        // Return processed item
        return {
          ...orderItem,
          item: item,
          price,
          discountPrice,
          quantity,
          modifiers: safeModifiers,
          itemNote: orderItem.itemNote || "",
          itemDiscount: orderItem.itemDiscount || { amount: 0 },
        };
      })
      .filter(Boolean); // Remove null items

    // If there are invalid items, return error
    if (invalidItems.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Some items in your order don't exist",
        invalidItems,
      });
    }

    // Batch fetch all taxes
    let taxCharge = 0;
    const taxes = await Tax.find({ _id: { $in: taxIds } });
    const taxBreakdown = taxes.map((taxDoc) => {
      const charge = parseFloat(
        ((subtotal * taxDoc.percentage) / 100).toFixed(2),
      );
      taxCharge += charge;

      return {
        taxId: taxDoc._id,
        taxCharge: charge,
      };
    });

    // Batch fetch all discounts
    let discountCharge = 0;
    const discounts = await Discount.find({ _id: { $in: discountIds } });
    const discountBreakdown = discounts.map((discountDoc) => {
      let amount = 0;

      if (discountDoc.type === "fixed") {
        amount = parseFloat(discountDoc.value);
      } else if (discountDoc.type === "percentage") {
        amount = parseFloat(((discountDoc.value * subtotal) / 100).toFixed(2));
      }

      discountCharge += amount;

      return {
        discountId: discountDoc._id,
        discountAmount: amount,
      };
    });

    // Format all monetary values to 2 decimal places
    subtotal = parseFloat(subtotal.toFixed(2));
    taxCharge = parseFloat(taxCharge.toFixed(2));
    discountCharge = parseFloat(discountCharge.toFixed(2));
    const restaurantTip = parseFloat(Number(restaurantTipCharge).toFixed(2));
    const delivery = parseFloat(Number(deliveryCharge).toFixed(2));
    const deliveryTip = parseFloat(Number(deliveryTipCharge).toFixed(2));

    // Calculate final order charge
    const orderFinalCharge = parseFloat(
      (
        subtotal +
        taxCharge +
        restaurantTip +
        delivery +
        deliveryTip -
        discountCharge
      ).toFixed(2),
    );

    // Create order object
    const orderData = {
      ...req.body,
      customerId: req.user._id,
      restaurantId: `restaurant_${req.restaurantId}`,
      orderItems,
      subtotal,
      tax: {
        taxes: taxBreakdown,
        totalTaxAmount: taxCharge,
      },
      discount: {
        discounts: discountBreakdown,
        totalDiscountAmount: discountCharge,
      },
      discountCharge,
      orderFinalCharge,
    };

    // Create and save order
    const newOrder = new Order(orderData);
    const savedOrder = await newOrder.save();

    // Return success response
    res.status(201).json({
      status: "success",
      message: "Order created successfully",
      data: savedOrder,
    });
  } catch (error) {
    // Log error for debugging
    console.error(`Order creation error: ${error.message}`);

    // Send appropriate error response
    if (error.message && error.message.includes("not found")) {
      return res.status(404).json({
        status: "error",
        message: error.message,
      });
    }

    // For other errors, return 500
    res.status(500).json({
      status: "error",
      message: "Failed to create order. Please try again.",
    });
  }
});

const getAllOrders = asyncHandler(async (req, res, next) => {
  const Order = getOrderModel(req.restaurantDb);
  const OrderType = getOrderTypeModel(req.restaurantDb);
  const Item = getItemModel(req.restaurantDb);
  const Tax = getTaxModel(req.restaurantDb);
  const User = getUserModel(req.user);
  const Discount = getDiscountModel(req.restaurantDb);

  const orderOperations = crudOperations({
    mainModel: Order,
    populateModels: [
      {
        field: "customerId",
        model: User,
        select: `name ${getQueryParams(req.queryOptions?.select?.user)}`,
      },
      {
        field: "orderType",
        model: OrderType,
        select: `orderType ${getQueryParams(
          req.queryOptions?.select?.orderType,
        )}`,
      },
      {
        field: "orderItems.item",
        model: Item,
        select: `name ${getQueryParams(req.queryOptions?.select?.item)}`,
      },
      {
        field: "tax.taxes.taxId",
        model: Tax,
        select: `name percentage ${getQueryParams(
          req.queryOptions?.select?.tax,
        )}`,
      },
      {
        field: "discount.discounts.discountId",
        model: Discount,
        select: "type value discountName",
      },
      {
        field: "refunds.history.processedBy",
        model: User,
        select: `name  ${getQueryParams(req.queryOptions?.select?.user)}`,
      },
    ],
  });
  orderOperations.getAll(req, res, next);
});

const getUserOrders = async (req, res) => {
  try {
    const Order = getOrderModel(req.restaurantDb);
    const Item = getItemModel(req.restaurantDb);

    const orders = await Order.find({ customerId: req.user._id })
      .sort({ createdAt: -1 })
      .populate([{ path: "orderItems.item", model: Item }]);

    res.status(200).json({
      status: "success",
      results: orders.length,
      data: {
        orders,
      },
    });
  } catch (error) {
    // logger.error("Error fetching user orders:", {
    //   error: error.message,
    //   userId: req.user._id,
    // });
    res.status(500).json({
      status: "error",
      message: "Error fetching orders",
      // error:
      //   process.env.NODE_ENV === "production"
      //     ? "Internal server error"
      //     : error.message,
    });
  }
};

const getOrderById = asyncHandler(async (req, res, next) => {
  const Order = getOrderModel(req.restaurantDb);
  const OrderType = getOrderTypeModel(req.restaurantDb);
  const Item = getItemModel(req.restaurantDb);
  const Tax = getTaxModel(req.restaurantDb);
  const User = getUserModel(req.user);
  const Discount = getDiscountModel(req.restaurantDb);

  const orderOperations = crudOperations({
    mainModel: Order,
    populateModels: [
      {
        field: "customerId",
        model: User,
        select: "name email",
      },
      {
        field: "orderType",
        model: OrderType,
        select: "orderType orderTypeNote",
      },
      {
        field: "orderItems.item",
        model: Item,
        select: "name description price image",
      },
      {
        field: "tax.taxes.taxId",
        model: Tax,
        select: "name percentage",
      },
      {
        field: "discount.discounts.discountId",
        model: Discount,
        select: "type value discountName",
      },
    ],
  });
  orderOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Order = getOrderModel(req.restaurantDb);
  const orderOperations = crudOperations({ mainModel: Order });
  orderOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Order = getOrderModel(req.restaurantDb);

  const updatedOrder = await Order.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate([
    { path: "orderItems.item" },
    { path: "tax.taxes.taxId" },
    { path: "discount.discounts.discountId" },
  ]);

  if (!updatedOrder) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Order not found",
    });
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: updatedOrder,
  });

  // Real-time update
  if (updatedOrder.tableNumber) {
    notifyOrderUpdate(req.restaurantId, updatedOrder.tableNumber, updatedOrder);
  }
});

const deleteAll = asyncHandler(async (req, res, next) => {
  const Order = getOrderModel(req.restaurantDb);
  const orderOperations = crudOperations({ mainModel: Order });
  orderOperations.deleteAll(req, res, next);
});

const createOrderWithPayment = asyncHandler(async (req, res) => {
  try {
    // Get models from database connection
    const Order = getOrderModel(req.restaurantDb);
    const Item = getItemModel(req.restaurantDb);
    const Tax = getTaxModel(req.restaurantDb);
    const Discount = getDiscountModel(req.restaurantDb);

    // Extract data from request body
    const {
      orderItems: clientOrderItems,
      tax: taxIds = [],
      discount: discountIds = [],
      restaurantTipCharge = 0,
      deliveryCharge = 0,
      deliveryTipCharge = 0,
      payment: paymentInfo,
      loyaltyCustomerId,
      pointsToRedeem,
      ...orderData
    } = req.body;

    // ==================== VALIDATION ====================

    // Validate order items
    if (!clientOrderItems || clientOrderItems.length === 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "Order must contain at least one item",
      });
    }

    // Validate payment information
    if (!paymentInfo || !paymentInfo.method) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "Payment information is required",
      });
    }

    const { method, transactionId, gateway, notes } = paymentInfo;

    // Validate payment method
    const validPaymentMethods = [
      "credit",
      "debit",
      "cash",
      "online",
      "wallet",
      "upi",
    ];
    if (!validPaymentMethods.includes(method)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: `Invalid payment method. Allowed: ${validPaymentMethods.join(
          ", ",
        )}`,
      });
    }

    // ==================== FETCH ITEMS ====================

    // Batch fetch all items in a single query
    const itemIds = clientOrderItems.map((item) => item.item);
    const items = await Item.find({ _id: { $in: itemIds } });

    // Create a map for quick lookup
    const itemsMap = {};
    items.forEach((item) => {
      itemsMap[item._id.toString()] = item;
    });

    // ==================== CALCULATE PRICES ====================

    let subtotal = 0;
    const invalidItems = [];
    const processedOrderItems = [];

    // Process each order item
    for (const orderItem of clientOrderItems) {
      const item = itemsMap[orderItem.item];

      // Validate item exists
      if (!item) {
        invalidItems.push(orderItem.item);
        continue;
      }

      // Validate item availability
      if (!item.isAvailable) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          status: "error",
          message: `Item "${item.name}" is currently unavailable`,
        });
      }

      const quantity = parseInt(orderItem.quantity) || 1;

      // SECURITY: Always use server-side price, never trust client
      const price = Number(item.price);

      // Calculate modifiers price if any
      let modifiersTotal = 0;
      if (orderItem.modifiers && Array.isArray(orderItem.modifiers)) {
        modifiersTotal = orderItem.modifiers.reduce((sum, mod) => {
          return sum + (Number(mod.price) || 0);
        }, 0);
      }

      const itemTotal = (price + modifiersTotal) * quantity;
      subtotal += itemTotal;

      processedOrderItems.push({
        item: item._id,
        quantity,
        price,
        specialInstructions: orderItem.specialInstructions || "",
        itemNote: orderItem.itemNote || "",
        itemDiscount: orderItem.itemDiscount || { amount: 0 },
        modifiers: orderItem.modifiers || [],
      });
    }

    // Check for invalid items
    if (invalidItems.length > 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "Some items in your order don't exist",
        invalidItems,
      });
    }

    // ==================== CALCULATE TAXES ====================

    let taxCharge = 0;
    const taxBreakdown = [];

    if (taxIds.length > 0) {
      const taxes = await Tax.find({ _id: { $in: taxIds } });

      for (const taxDoc of taxes) {
        const charge = parseFloat(
          ((subtotal * taxDoc.percentage) / 100).toFixed(2),
        );
        taxCharge += charge;

        taxBreakdown.push({
          taxId: taxDoc._id,
          taxCharge: charge,
        });
      }
    }

    // ==================== CALCULATE DISCOUNTS ====================

    let discountCharge = 0;
    const discountBreakdown = [];

    if (discountIds.length > 0) {
      const discounts = await Discount.find({ _id: { $in: discountIds } });

      for (const discountDoc of discounts) {
        let amount = 0;

        if (discountDoc.type === "fixed") {
          amount = parseFloat(discountDoc.value);
        } else if (discountDoc.type === "percentage") {
          amount = parseFloat(
            ((discountDoc.value * subtotal) / 100).toFixed(2),
          );
        }

        discountCharge += amount;

        discountBreakdown.push({
          discountId: discountDoc._id,
          discountAmount: amount,
        });
      }
    }

    // ==================== APPLY LOYALTY DISCOUNT (OPTIONAL) ====================

    let loyaltyDiscountAmount = 0;
    let loyaltyPointsRedeemed = 0;

    if (loyaltyCustomerId && pointsToRedeem && pointsToRedeem > 0) {
      const loyaltyResult = await applyLoyaltyDiscount(
        loyaltyCustomerId,
        pointsToRedeem,
        req.restaurantDb,
        req.restaurantId,
      );

      if (!loyaltyResult.success) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          status: "error",
          message: loyaltyResult.error,
        });
      }

      loyaltyDiscountAmount = loyaltyResult.discountAmount;
      loyaltyPointsRedeemed = pointsToRedeem;

      // Add loyalty discount to the breakdown
      discountBreakdown.push({
        discountId: null,
        discountName: "Loyalty Points Redemption",
        discountAmount: loyaltyDiscountAmount,
        pointsRedeemed: loyaltyPointsRedeemed,
      });
      discountCharge += loyaltyDiscountAmount;
    }

    // ==================== CALCULATE FINAL CHARGE ====================

    // Format all monetary values to 2 decimal places
    subtotal = parseFloat(subtotal.toFixed(2));
    taxCharge = parseFloat(taxCharge.toFixed(2));
    discountCharge = parseFloat(discountCharge.toFixed(2));
    const restaurantTip = parseFloat(Number(restaurantTipCharge).toFixed(2));
    const delivery = parseFloat(Number(deliveryCharge).toFixed(2));
    const deliveryTip = parseFloat(Number(deliveryTipCharge).toFixed(2));

    // Calculate final order charge
    const orderFinalCharge = parseFloat(
      (
        subtotal +
        taxCharge +
        restaurantTip +
        delivery +
        deliveryTip -
        discountCharge
      ).toFixed(2),
    );

    // Validate final charge is positive
    if (orderFinalCharge <= 0) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "Order total must be greater than zero",
      });
    }

    // ==================== CREATE PAYMENT ENTRY ====================

    // Use actual paid amount from request, or default to full amount if not specified
    // (though logically for 'create-with-payment' it usually implies full payment, checking provides flexibility)
    const paidAmount = Number(paymentInfo.amount) || orderFinalCharge;

    // Determine status based on paid amount
    let paymentStatus = PAYMENT_STATUS.PENDING;
    let balanceDue = 0;

    if (paidAmount >= orderFinalCharge) {
      paymentStatus = PAYMENT_STATUS.PAID;
      balanceDue = 0;
    } else if (paidAmount > 0) {
      paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
      balanceDue = parseFloat((orderFinalCharge - paidAmount).toFixed(2));
    } else {
      paymentStatus = PAYMENT_STATUS.PENDING; // Should catch this in validation early on if amount < 0
      balanceDue = orderFinalCharge;
    }

    const paymentEntry = {
      method,
      transactionId: transactionId || null,
      status: TRANSACTION_STATUS.COMPLETE,
      amount: paidAmount,
      processedAt: new Date(),
      processedBy: req.user?._id || null,
      gateway: gateway || null,
      notes: notes || "",
    };

    // ==================== CREATE ORDER ====================

    const newOrderData = {
      ...orderData,
      restaurantId: req.restaurantId,
      customerId: req.user._id,
      orderItems: processedOrderItems,
      subtotal,
      restaurantTipCharge: restaurantTip,
      deliveryCharge: delivery,
      deliveryTipCharge: deliveryTip,
      tax: {
        taxes: taxBreakdown,
        totalTaxAmount: taxCharge,
      },
      discount: {
        discounts: discountBreakdown,
        totalDiscountAmount: discountCharge,
      },
      orderFinalCharge,
      totalItemCount: processedOrderItems.reduce(
        (sum, item) => sum + item.quantity,
        0,
      ),
      payment: {
        history: [paymentEntry],
        totalPaid: paidAmount,
        balanceDue: balanceDue,
        paymentStatus: paymentStatus,
      },
      orderStatus: ORDER_STATUS.COMPLETED,
    };

    // Create and save order
    const newOrder = new Order(newOrderData);
    const savedOrder = await newOrder.save();

    // Log successful order creation
    logger.info("Order created with payment", {
      orderId: savedOrder.orderId,
      customerId: req.user._id,
      amount: orderFinalCharge,
      paymentMethod: method,
    });

    // ==================== RETURN RESPONSE ====================

    res.status(HTTP_STATUS.CREATED).json({
      status: "success",
      message: "Order created and payment processed successfully",
      data: {
        order: savedOrder,
        summary: {
          orderId: savedOrder.orderId,
          subtotal,
          tax: taxCharge,
          discount: discountCharge,
          deliveryCharge: delivery,
          tips: restaurantTip + deliveryTip,
          total: orderFinalCharge,
          paymentStatus: PAYMENT_STATUS.PAID,
          orderStatus: ORDER_STATUS.CONFIRMED,
          ...(loyaltyPointsRedeemed > 0 && {
            loyaltyRedemption: {
              pointsRedeemed: loyaltyPointsRedeemed,
              discountAmount: loyaltyDiscountAmount,
            },
          }),
        },
      },
    });
  } catch (error) {
    // Log error for debugging
    logger.error("Order creation with payment error", {
      error: error.message,
      stack: error.stack,
      userId: req.user?._id,
    });

    // Send appropriate error response
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Failed to create order with payment. Please try again.",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
});

const cancelOrder = asyncHandler(async (req, res) => {
  try {
    const Order = getOrderModel(req.restaurantDb);
    const order = await Order.findById(req.params.orderId);

    if (!order) {
      return res.status(HTTP_STATUS.NOT_FOUND).json({
        status: "error",
        message: "Order not found",
      });
    }

    // Check if order can be cancelled
    // const cancellableStatuses = [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED];
    // if (!cancellableStatuses.includes(order.orderStatus)) {
    //   return res.status(HTTP_STATUS.BAD_REQUEST).json({
    //     status: "error",
    //     message: "Order cannot be cancelled at this stage",
    //   });
    // }

    order.orderStatus = ORDER_STATUS.CANCELED;
    order.statusHistory.push({
      status: ORDER_STATUS.CANCELED,
      timestamp: new Date(),
      updatedBy: req.user.name || req.user.email,
    });

    await order.save();

    logger.info("Order cancelled", {
      orderId: order.orderId,
      cancelledBy: req.user._id,
    });

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      message: "Order cancelled successfully",
      data: {
        order,
      },
    });
  } catch (error) {
    logger.error("Error cancelling order:", {
      error: error.message,
      orderId: req.params.orderId,
    });
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Error cancelling order",
      error:
        process.env.NODE_ENV === "production"
          ? "Internal server error"
          : error.message,
    });
  }
});

// Helper to recalculate order totals (exported for use in dineInController and locally)
const recalculateOrderTotals = async (order, restaurantDb) => {
  const Item = getItemModel(restaurantDb);
  const Tax = getTaxModel(restaurantDb);
  const Discount = getDiscountModel(restaurantDb);

  // Populate items with taxRate
  await order.populate({
    path: "orderItems.item",
    populate: { path: "taxRate", model: Tax },
  });

  let subtotal = 0;
  let accumulatedTaxes = {};

  // Iterate over Order Items
  for (const orderItem of order.orderItems) {
    if (!orderItem.item) continue;

    const price = orderItem.price || 0;
    const quantity = orderItem.quantity || 1;

    let modifiersTotal = 0;
    if (orderItem.modifiers && Array.isArray(orderItem.modifiers)) {
      modifiersTotal = orderItem.modifiers.reduce(
        (sum, mod) => sum + (Number(mod.price) || 0),
        0,
      );
    }
    const lineItemTotal = (price + modifiersTotal) * quantity;
    subtotal += lineItemTotal;

    if (
      orderItem.item.taxable &&
      orderItem.item.taxRate &&
      orderItem.item.taxRate.length > 0
    ) {
      for (const taxDoc of orderItem.item.taxRate) {
        if (taxDoc && typeof taxDoc.percentage === "number") {
          const taxAmount = (lineItemTotal * taxDoc.percentage) / 100;
          if (!accumulatedTaxes[taxDoc._id.toString()]) {
            accumulatedTaxes[taxDoc._id.toString()] = {
              taxId: taxDoc._id,
              percentage: taxDoc.percentage,
              taxCharge: 0,
            };
          }
          accumulatedTaxes[taxDoc._id.toString()].taxCharge += taxAmount;
        }
      }
    }
  }

  const taxBreakdown = Object.values(accumulatedTaxes).map((t) => ({
    taxId: t.taxId,
    taxCharge: parseFloat(t.taxCharge.toFixed(2)),
  }));

  const totalTaxAmount = parseFloat(
    taxBreakdown.reduce((sum, t) => sum + t.taxCharge, 0).toFixed(2),
  );

  let discountCharge = 0;
  const discountBreakdown = [];

  if (order.discount && order.discount.discounts) {
    const linkedDiscounts = order.discount.discounts.filter((d) => d.discountId);
    const manualDiscounts = order.discount.discounts.filter(
      (d) => !d.discountId,
    );

    if (linkedDiscounts.length > 0) {
      const discountIds = linkedDiscounts.map((d) => d.discountId);
      const discounts = await Discount.find({ _id: { $in: discountIds } });
      for (const discountDoc of discounts) {
        let amount = 0;
        if (discountDoc.type === "fixed") {
          amount = parseFloat(discountDoc.value);
        } else if (discountDoc.type === "percentage") {
          amount = parseFloat(
            ((discountDoc.value * subtotal) / 100).toFixed(2),
          );
        }
        discountCharge += amount;
        discountBreakdown.push({
          discountId: discountDoc._id,
          discountName: discountDoc.discountName,
          discountAmount: amount,
        });
      }
    }
    for (const manual of manualDiscounts) {
      discountCharge += manual.discountAmount || 0;
      discountBreakdown.push(manual);
    }
  }

  const restaurantTip = order.restaurantTipCharge || 0;
  const delivery = order.deliveryCharge || 0;
  const deliveryTip = order.deliveryTipCharge || 0;

  subtotal = parseFloat(subtotal.toFixed(2));
  discountCharge = parseFloat(discountCharge.toFixed(2));

  const orderFinalCharge = parseFloat(
    (
      subtotal +
      totalTaxAmount +
      restaurantTip +
      delivery +
      deliveryTip -
      discountCharge
    ).toFixed(2),
  );

  order.subtotal = subtotal;
  order.tax = {
    taxes: taxBreakdown,
    totalTaxAmount: totalTaxAmount,
  };
  order.discount = {
    discounts: discountBreakdown,
    totalDiscountAmount: discountCharge,
  };
  order.orderFinalCharge = orderFinalCharge;
  order.totalItemCount = order.orderItems.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  if (!order.payment)
    order.payment = { totalPaid: 0, balanceDue: 0, history: [] };
  const totalPaid = order.payment.totalPaid || 0;
  order.payment.balanceDue = parseFloat(
    (orderFinalCharge - totalPaid).toFixed(2),
  );

  return order;
};

/**
 * Apply Loyalty Discount to Order (Common for all order types)
 * POST /api/v1/orders/:orderId/apply-loyalty-discount
 */
const applyLoyaltyDiscountToOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { pointsToRedeem, loyaltyCustomerId } = req.body;

  if (!pointsToRedeem || pointsToRedeem <= 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: "Points must be a positive number",
    });
  }

  const Order = getOrderModel(req.restaurantDb);
  const order = await Order.findById(orderId);

  if (!order) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Order not found",
    });
  }

  const result = await applyLoyaltyDiscount(
    loyaltyCustomerId,
    pointsToRedeem,
    req.restaurantDb,
    req.restaurantId,
  );

  if (!result.success) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: result.error,
    });
  }

  if (!order.discount) {
    order.discount = { discounts: [], totalDiscountAmount: 0 };
  }

  order.discount.discounts.push({
    discountId: null,
    discountName: "Loyalty Points Redemption",
    discountAmount: result.discountAmount,
    pointsRedeemed: pointsToRedeem,
  });

  await recalculateOrderTotals(order, req.restaurantDb);
  await order.save();

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: result.message,
    data: {
      order,
      remainingPoints: result.remainingPoints,
    },
  });
});

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  deleteById,
  updateById,
  deleteAll,
  getUserOrders,
  createOrderWithPayment,
  cancelOrder,
  recalculateOrderTotals,
  applyLoyaltyDiscountToOrder
};
