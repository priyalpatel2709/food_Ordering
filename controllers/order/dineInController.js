const asyncHandler = require("express-async-handler");
const {
  getOrderModel,
  getItemModel,
  getRestaurantModel,
  getTaxModel,
  getDiscountModel,
  getUserModel,
  getTableModel,
} = require("../../models/index");
const {
  ORDER_STATUS,
  HTTP_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  ORDER_STATUS_TRANSITIONS,
} = require("../../utils/const");
const { logger } = require("../../middleware/loggingMiddleware");
const {
  emitTableOrderUpdate,
  emitTableStatusUpdate,
} = require("../../services/realtimeService");

const {
  getCustomerLoyaltyInfo,
  applyLoyaltyDiscount,
} = require("../../middleware/loyaltyMiddleware");
const { awardLoyaltyPoints } = require("../../middleware/loyaltyMiddleware");

// Helper to recalculate order totals
const recalculateOrderTotals = async (order, restaurantDb) => {
  const Item = getItemModel(restaurantDb);
  // Tax and Discount models are needed if we were fetching by ID,
  // but here we populate via Mongoose
  const Tax = getTaxModel(restaurantDb);
  const Discount = getDiscountModel(restaurantDb);

  // Populate items with taxRate
  // We need the tax documents physically to get the percentage
  await order.populate({
    path: "orderItems.item",
    populate: { path: "taxRate", model: Tax },
  });

  let subtotal = 0;
  // Use a map to accumulate tax amounts per Tax ID
  let accumulatedTaxes = {}; // { [taxId]: { taxId, percentage, taxCharge } }

  // Iterate over Order Items
  for (const orderItem of order.orderItems) {
    if (!orderItem.item) continue;

    // Price and Quantity
    const price = orderItem.price || 0;
    const quantity = orderItem.quantity || 1;

    // Calculate Item Total (including modifiers)
    let modifiersTotal = 0;
    if (orderItem.modifiers && Array.isArray(orderItem.modifiers)) {
      modifiersTotal = orderItem.modifiers.reduce(
        (sum, mod) => sum + (Number(mod.price) || 0),
        0,
      );
    }
    const lineItemTotal = (price + modifiersTotal) * quantity;

    // Add to Subtotal
    subtotal += lineItemTotal;

    // Calculate Item-Level Tax
    // Check if item is taxable and has tax rates
    if (
      orderItem.item.taxable &&
      orderItem.item.taxRate &&
      orderItem.item.taxRate.length > 0
    ) {
      for (const taxDoc of orderItem.item.taxRate) {
        // Ensure taxDoc is populated and valid
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

  // Construct Tax Breakdown Array
  const taxBreakdown = Object.values(accumulatedTaxes).map((t) => ({
    taxId: t.taxId,
    taxCharge: parseFloat(t.taxCharge.toFixed(2)),
  }));

  const totalTaxAmount = parseFloat(
    taxBreakdown.reduce((sum, t) => sum + t.taxCharge, 0).toFixed(2),
  );

  // Discounts (Global Discounts Logic)
  // We handle both defined discounts (via discountId) and manual/loyalty discounts (where discountId is null)
  let discountCharge = 0;
  const discountBreakdown = [];

  if (order.discount && order.discount.discounts) {
    // 1. Extract discounts that have a physical ID to re-calculate (percentage-based might change)
    const linkedDiscounts = order.discount.discounts.filter((d) => d.discountId);
    const manualDiscounts = order.discount.discounts.filter(
      (d) => !d.discountId,
    );

    // 2. Re-calculate linked discounts from the database
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

    // 3. Add manual/loyalty discounts (already fixed amounts)
    for (const manual of manualDiscounts) {
      discountCharge += manual.discountAmount || 0;
      discountBreakdown.push(manual);
    }
  }

  // Tips & Delivery
  const restaurantTip = order.restaurantTipCharge || 0;
  const delivery = order.deliveryCharge || 0;
  const deliveryTip = order.deliveryTipCharge || 0;

  subtotal = parseFloat(subtotal.toFixed(2));
  discountCharge = parseFloat(discountCharge.toFixed(2));
  // Tax is already fixed per item accumulation, but total is fixed.

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

  // Update Order
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

  // Update balanceDue
  if (!order.payment)
    order.payment = { totalPaid: 0, balanceDue: 0, history: [] };
  const totalPaid = order.payment.totalPaid || 0;
  order.payment.balanceDue = parseFloat(
    (orderFinalCharge - totalPaid).toFixed(2),
  );

  return order;
};

// 1. Get Tables Status
const getTablesStatus = asyncHandler(async (req, res) => {
  const Table = getTableModel(req.restaurantDb);

  const tables = await Table.find({})
    .populate({
      path: "currentOrderId",
      select: "orderStatus orderFinalCharge contactName serverName",
    })
    .sort({ tableNumber: 1 });

  if (!tables || tables.length === 0) {
    return res.status(HTTP_STATUS.OK).json({
      status: "success",
      data: { totalTables: 0, tables: [] },
    });
  }

  const tableData = tables.map((t) => ({
    id: t._id,
    tableNumber: t.tableNumber,
    status: t.status,
    seatingCapacity: t.seatingCapacity,
    orderId: t.currentOrderId ? t.currentOrderId._id : null,
    orderStatus: t.currentOrderId ? t.currentOrderId.orderStatus : null,
    amount: t.currentOrderId ? t.currentOrderId.orderFinalCharge : 0,
    customerName: t.currentOrderId
      ? t.currentOrderId.contactName || t.currentOrderId.serverName
      : null,
  }));

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: { totalTables: tableData.length, tables: tableData },
  });
});

// 2. Create Dine-In Order (Open Table)
const createDineInOrder = asyncHandler(async (req, res) => {
  const {
    tableNumber,
    items = [],
    isScheduledOrder,
    scheduledTime,
    customerId,
  } = req.body;

  if (!tableNumber) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ status: "error", message: "Table number is required" });
  }

  // Validate scheduled order fields
  if (isScheduledOrder) {
    if (!scheduledTime) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "scheduledTime is required for scheduled orders",
      });
    }

    const scheduledDate = new Date(scheduledTime);
    if (scheduledDate <= new Date()) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        status: "error",
        message: "Scheduled time must be in the future",
      });
    }
  }

  const Order = getOrderModel(req.restaurantDb);
  const Table = getTableModel(req.restaurantDb);

  // Check table status
  const table = await Table.findOne({ tableNumber: tableNumber.toString() });
  if (!table) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: `Table ${tableNumber} not found`,
    });
  }

  if (table.status !== "available" && table.status !== "cleaning") {
    return res.status(HTTP_STATUS.CONFLICT).json({
      status: "error",
      message: `Table ${tableNumber} is currently ${table.status}`,
    });
  }

  const Item = getItemModel(req.restaurantDb);

  let orderItems = [];
  let subtotal = 0;

  if (items.length > 0) {
    const itemIds = items.map((i) => i.item);
    const dbItems = await Item.find({ _id: { $in: itemIds } });
    const itemsMap = {};
    dbItems.forEach((i) => (itemsMap[i._id.toString()] = i));

    for (const i of items) {
      const dbItem = itemsMap[i.item];
      if (dbItem) {
        const price = Number(dbItem.price);
        const quantity = Number(i.quantity) || 1;

        let safeModifiers = [];
        if (i.modifiers && Array.isArray(i.modifiers)) {
          safeModifiers = i.modifiers.map((m) => ({
            name: m.name ? String(m.name) : "Option",
            price: Number(m.price) || 0,
          }));
        }

        const modTotal = safeModifiers.reduce((s, m) => s + m.price, 0);

        subtotal += (price + modTotal) * quantity;
        orderItems.push({
          item: dbItem._id,
          quantity,
          price,
          specialInstructions: i.specialInstructions,
          modifiers: safeModifiers,
          itemStatus: "new",
        });
      }
    }
  }

  const orderData = {
    customerId: customerId,
    tableId: table._id,
    tableNumber: tableNumber.toString(),
    serverName: req.user.name,
    source: "staff",
    orderItems,
    subtotal,
    orderFinalCharge: subtotal,
    orderStatus: ORDER_STATUS.PENDING,
  };

  // Add scheduled order fields if applicable
  if (isScheduledOrder) {
    orderData.isScheduledOrder = true;
    orderData.scheduledTime = new Date(scheduledTime);
    orderData.scheduledOrderStatus = "pending";
  }

  const newOrder = new Order(orderData);
  const savedOrder = await newOrder.save();

  // Update Table Status
  table.status = items.length > 0 ? "ongoing" : "occupied";
  table.currentOrderId = savedOrder._id;
  await table.save();

  // If items were added, run recalculate
  if (items.length > 0) {
    const reCalced = await recalculateOrderTotals(savedOrder, req.restaurantDb);
    await reCalced.save();
  }

  res.status(HTTP_STATUS.CREATED).json({
    status: "success",
    data: savedOrder,
  });

  // Real-time update
  emitTableStatusUpdate(req.restaurantId, savedOrder.tableNumber, {
    status: items.length > 0 ? "ongoing" : "occupied",
    orderId: savedOrder._id,
    amount: savedOrder.orderFinalCharge,
    customerName: savedOrder.contactName || savedOrder.serverName,
  });
});

// 2.5 Lookup Customer Loyalty Info (for POS display)
const lookupCustomer = asyncHandler(async (req, res) => {
  const { identifier } = req.params; // phone, email, or customer ID

  const customerInfo = await getCustomerLoyaltyInfo(
    identifier,
    req.restaurantDb,
    req.restaurantId,
  );

  if (!customerInfo) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Customer not found",
    });
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: customerInfo,
  });
});

// 3. Add Items to Order
const addItemsToOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { items } = req.body; // Array of { item, quantity, modifiers }

  const Order = getOrderModel(req.restaurantDb);
  const Item = getItemModel(req.restaurantDb);

  const order = await Order.findById(orderId);
  if (!order)
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ status: "error", message: "Order not found" });

  if (!items || items.length === 0)
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: "No items provided" });

  // Validate items
  const itemIds = items.map((i) => i.item);
  const dbItems = await Item.find({ _id: { $in: itemIds } });
  const itemsMap = {};
  dbItems.forEach((i) => (itemsMap[i._id.toString()] = i));

  const newOrderItems = [];
  for (const i of items) {
    const dbItem = itemsMap[i.item];
    if (!dbItem) continue; // Skip invalid

    const price = Number(dbItem.price);
    const quantity = Number(i.quantity) || 1;

    let safeModifiers = [];
    if (i.modifiers && Array.isArray(i.modifiers)) {
      safeModifiers = i.modifiers.map((m) => ({
        name: m.name ? String(m.name) : "Option",
        price: Number(m.price) || 0,
      }));
    }

    order.orderItems.push({
      item: dbItem._id,
      quantity,
      price,
      modifiers: safeModifiers,
      specialInstructions: i.specialInstructions,
      itemStatus: "new",
      kdsTimestamps: {
        startedAt: null,
        preparedAt: null,
        readyAt: null,
      },
    });
  }

  // Recalculate
  await recalculateOrderTotals(order, req.restaurantDb);

  // Update status to CONFIRMED or ONGOING if it was PENDING?
  // if (order.orderStatus === ORDER_STATUS.PENDING) {
  //   order.orderStatus = ORDER_STATUS.CONFIRMED; // Now it has items and is "live"
  // }

  // Reset KDS Status because new items are added
  // If we have mixed items, the KDS logic (min status) implies "new" or "started"
  // We set it to 'new' or 'start' generally if there's work to do.
  // The safest is to let the first update fix it, or force it to 'new' since we added 'new' items.
  order.kdsStatus = "new";
  if (order.orderStatus === ORDER_STATUS.READY) {
    order.orderStatus = ORDER_STATUS.CONFIRMED; // Revert to confirmed if it was ready
  }

  const saved = await order.save();

  // Update Table status to ongoing
  const Table = getTableModel(req.restaurantDb);
  if (saved.tableId) {
    await Table.findByIdAndUpdate(saved.tableId, { status: "ongoing" });
  } else {
    await Table.findOneAndUpdate(
      { tableNumber: saved.tableNumber },
      { status: "ongoing" },
    );
  }

  // Return success response
  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: saved,
  });

  // Populate for real-time notification
  await saved.populate([
    { path: "orderItems.item" },
    { path: "discount.discounts.discountId" },
    { path: "tax.taxes.taxId" },
  ]);

  // Real-time update
  emitTableOrderUpdate(req.restaurantId, saved.tableNumber, saved);
  emitTableStatusUpdate(req.restaurantId, saved.tableNumber, {
    status: "ongoing",
    orderId: saved._id,
    amount: saved.orderFinalCharge,
    customerName: saved.contactName || saved.serverName,
  });
});

// 4. Complete / Pay Order
const completeDineInCheckout = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { payment } = req.body; // { method, amount, ... }

  const Order = getOrderModel(req.restaurantDb);
  const order = await Order.findById(orderId);
  if (!order)
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ status: "error", message: "Order not found" });

  if (order.orderStatus === ORDER_STATUS.COMPLETED) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: "Order already completed" });
  }

  // Pay logic
  if (!payment) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ status: "error", message: "Payment information is required" });
  }

  // Handle Discounts if provided
  if (payment.discount) {
    order.discount = payment.discount;
    // Recalculate order totals to apply the discount to final charge and balanceDue
    await recalculateOrderTotals(order, req.restaurantDb);
  }

  const { method, transactionId, gateway, notes } = payment;
  const amount = Number(payment.amount);

  if (amount < order.balanceDue) {
    // Partial payment? Requirement: "After successful payment... table reset". Implies full payment.
    // But let's assume one-shot for now.
    // If amount undefined, assume full.
  }

  const payAmount = amount || order.orderFinalCharge;

  // Update payment history
  order.payment.history.push({
    method,
    transactionId,
    status: TRANSACTION_STATUS.COMPLETE,
    amount: payAmount,
    processedAt: new Date(),
    processedBy: req.user._id,
    gateway,
    notes,
  });

  order.payment.totalPaid += payAmount;
  order.payment.balanceDue = order.orderFinalCharge - order.payment.totalPaid;

  if (order.payment.balanceDue <= 0.01) {
    // Floating point tolerance
    order.payment.paymentStatus = PAYMENT_STATUS.PAID;
    order.orderStatus = ORDER_STATUS.COMPLETED; // This frees the table
    order.payment.balanceDue = 0;

    // Release Table
    const Table = getTableModel(req.restaurantDb);
    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, {
        status: "available",
        currentOrderId: null,
      });
    } else {
      await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { status: "available", currentOrderId: null },
      );
    }
  } else {
    order.payment.paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
    // Do NOT close table if partially paid
  }

  const saved = await order.save();

  console.log("saved.orderStatus ", saved.orderStatus);
  console.log("saved", saved);

  // Award loyalty points if order is completed
  // if (saved.orderStatus === ORDER_STATUS.COMPLETED) {
  if (true) {
    try {
      await awardLoyaltyPoints(saved, req.restaurantDb);
    } catch (error) {
      console.error("Error awarding loyalty points:", error);
    }
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: saved,
  });

  // Populate for real-time notification
  await saved.populate([
    { path: "orderItems.item" },
    { path: "discount.discounts.discountId" },
    { path: "tax.taxes.taxId" },
  ]);

  // Real-time update - Notify the table page about status change/payment
  emitTableOrderUpdate(req.restaurantId, saved.tableNumber, saved);

  // Real-time update - Table is available if fully paid (Grid View)
  emitTableStatusUpdate(req.restaurantId, saved.tableNumber, {
    status:
      saved.orderStatus === ORDER_STATUS.COMPLETED ? "available" : "ongoing",
    orderId: saved.orderStatus === ORDER_STATUS.COMPLETED ? null : saved._id,
    amount: saved.orderFinalCharge,
    customerName: saved.contactName || saved.serverName,
  });
});

/**
 * Apply Loyalty Discount to Order
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

  // 1. Redeems points using middleware utility
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

  // 2. Add loyalty discount to order
  if (!order.discount) {
    order.discount = { discounts: [], totalDiscountAmount: 0 };
  }

  order.discount.discounts.push({
    discountId: null, // Indicates manual/loyalty discount
    discountName: "Loyalty Points Redemption",
    discountAmount: result.discountAmount,
    pointsRedeemed: pointsToRedeem, // Supplemental info
  });

  // 3. Recalculate totals
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

// 5. Remove Dine-In Order (If New/Pending)
const removeDineInOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const Order = getOrderModel(req.restaurantDb);

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Order not found",
    });
  }

  // Only allow removing if status is PENDING (new)
  if (order.orderStatus !== ORDER_STATUS.PENDING) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: `Cannot remove order in ${order.orderStatus} status. Only PENDING orders can be removed.`,
    });
  }

  // Capture info for real-time notification before deletion
  const tableNum = order.tableNumber;
  const tableId = order.tableId;

  // Release Table
  const Table = getTableModel(req.restaurantDb);
  if (tableId) {
    await Table.findByIdAndUpdate(tableId, {
      status: "available",
      currentOrderId: null,
    });
  } else {
    await Table.findOneAndUpdate(
      { tableNumber: tableNum },
      { status: "available", currentOrderId: null },
    );
  }

  // Find and delete the order
  await Order.findByIdAndDelete(orderId);

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Dine-in order removed successfully",
  });

  // Real-time update - Table is now available
  emitTableStatusUpdate(req.restaurantId, tableNum, {
    status: "available",
    orderId: null,
    amount: 0,
    customerName: null,
  });
});

// 6. Remove Item from Order (If item is in 'new' status)
const removeOrderItem = asyncHandler(async (req, res) => {
  const { orderId, itemId } = req.params; // itemId is the _id of the item in orderItems array
  const Order = getOrderModel(req.restaurantDb);

  const order = await Order.findById(orderId);
  if (!order) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Order not found",
    });
  }

  // Find the item in orderItems
  // Support both the order item's unique _id and the product's _id for flexibility
  const itemIndex = order.orderItems.findIndex(
    (i) =>
      i._id.toString() === itemId || (i.item && i.item.toString() === itemId),
  );

  if (itemIndex === -1) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: `Item with ID ${itemId} not found in order ${orderId}`,
    });
  }

  const item = order.orderItems[itemIndex];

  // Only allow removing if item is in "new" state
  // Or if the whole order is PENDING
  if (item.itemStatus !== "new" && order.orderStatus !== ORDER_STATUS.PENDING) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: `Cannot remove item as it is already ${item.itemStatus} and order is ${order.orderStatus}`,
    });
  }

  // Remove the item
  order.orderItems.splice(itemIndex, 1);

  // Recalculate totals
  await recalculateOrderTotals(order, req.restaurantDb);
  await order.save();

  // Update Table status if items become empty
  if (order.orderItems.length === 0) {
    const Table = getTableModel(req.restaurantDb);
    if (order.tableId) {
      await Table.findByIdAndUpdate(order.tableId, { status: "occupied" });
    } else {
      await Table.findOneAndUpdate(
        { tableNumber: order.tableNumber },
        { status: "occupied" },
      );
    }
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Item removed from order",
    data: order,
  });

  // Populate for real-time notification
  await order.populate([
    { path: "orderItems.item" },
    { path: "discount.discounts.discountId" },
    { path: "tax.taxes.taxId" },
  ]);

  // Real-time update
  emitTableOrderUpdate(req.restaurantId, order.tableNumber, order);
  emitTableStatusUpdate(req.restaurantId, order.tableNumber, {
    status: order.orderItems.length > 0 ? "ongoing" : "occupied",
    orderId: order._id,
    amount: order.orderFinalCharge,
    customerName: order.contactName || order.serverName,
  });
});

module.exports = {
  getTablesStatus,
  createDineInOrder,
  lookupCustomer,
  addItemsToOrder,
  completeDineInCheckout,
  applyLoyaltyDiscountToOrder,
  removeDineInOrder,
  removeOrderItem,
  recalculateOrderTotals,
};
