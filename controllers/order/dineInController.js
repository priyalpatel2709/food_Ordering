const asyncHandler = require("express-async-handler");
const {
  getOrderModel,
  getItemModel,
  getRestaurantModel,
  getTaxModel,
  getDiscountModel,
  getUserModel,
} = require("../../models/index");
const {
  ORDER_STATUS,
  HTTP_STATUS,
  PAYMENT_STATUS,
  TRANSACTION_STATUS,
  ORDER_STATUS_TRANSITIONS,
} = require("../../utils/const");
const { logger } = require("../../middleware/loggingMiddleware");

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
        0
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
    taxBreakdown.reduce((sum, t) => sum + t.taxCharge, 0).toFixed(2)
  );

  // Discounts (Global Discounts Logic - applied to subtotal usually)
  let discountCharge = 0;
  const discountBreakdown = [];
  if (order.discount && order.discount.discounts) {
    const discountIds = order.discount.discounts.map((d) => d.discountId);
    if (discountIds.length > 0) {
      const discounts = await Discount.find({ _id: { $in: discountIds } });
      for (const discountDoc of discounts) {
        let amount = 0;
        if (discountDoc.type === "fixed") {
          amount = parseFloat(discountDoc.value);
        } else if (discountDoc.type === "percentage") {
          amount = parseFloat(
            ((discountDoc.value * subtotal) / 100).toFixed(2)
          );
        }
        discountCharge += amount;
        discountBreakdown.push({
          discountId: discountDoc._id,
          discountAmount: amount,
        });
      }
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
    ).toFixed(2)
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
    0
  );

  // Update balanceDue
  if (!order.payment)
    order.payment = { totalPaid: 0, balanceDue: 0, history: [] };
  const totalPaid = order.payment.totalPaid || 0;
  order.payment.balanceDue = parseFloat(
    (orderFinalCharge - totalPaid).toFixed(2)
  );

  return order;
};

// 1. Get Tables Status
const getTablesStatus = asyncHandler(async (req, res) => {
  const Restaurant = getRestaurantModel(req.restaurantDb);
  const restaurantDoc = await Restaurant.findOne({
    restaurantId: `restaurant_${req.restaurantId}`,
  });

  if (!restaurantDoc) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ status: "error", message: "Restaurant configuration not found" });
  }

  const totalTables = restaurantDoc.tableConfiguration?.totalTables || 0;

  const Order = getOrderModel(req.restaurantDb);
  const activeStatuses = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
    ORDER_STATUS.SERVED,
  ];

  const activeOrders = await Order.find({
    orderStatus: { $in: activeStatuses },
    tableNumber: { $exists: true, $ne: null },
  });

  const activeOrdersMap = {};
  activeOrders.forEach((order) => {
    if (order.tableNumber) activeOrdersMap[order.tableNumber] = order;
  });

  const tables = [];
  for (let i = 1; i <= totalTables; i++) {
    const tableNum = i.toString();
    const order = activeOrdersMap[tableNum];

    let status = "available";


    if (order) {
      status = order?.orderItems === undefined ? "occupied" : "ongoing";
    }

    tables.push({
      tableNumber: tableNum,
      status,
      orderId: order ? order._id : null,
      orderStatus: order ? order.orderStatus : null,
      amount: order ? order.orderFinalCharge : 0,
      customerName: order ? order.contactName : null,
    });
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: { totalTables, tables },
  });
});

// 2. Create Dine-In Order (Open Table)
const createDineInOrder = asyncHandler(async (req, res) => {
  const { tableNumber, items = [] } = req.body;

  if (!tableNumber) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ status: "error", message: "Table number is required" });
  }

  const Order = getOrderModel(req.restaurantDb);

  // Check if occupied
  const activeStatuses = [
    ORDER_STATUS.PENDING,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.READY,
    ORDER_STATUS.SERVED,
  ];
  const existingOrder = await Order.findOne({
    tableNumber: tableNumber.toString(),
    orderStatus: { $in: activeStatuses },
  });

  if (existingOrder) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      status: "error",
      message: `Table ${tableNumber} is already occupied`,
    });
  }

  // Call standard createOrder logic or replicate minimal
  // If items are provided, process them. If not, create empty order (Occupied).

  const Item = getItemModel(req.restaurantDb);
  // const Tax = getTaxModel(req.restaurantDb);
  // const Discount = getDiscountModel(req.restaurantDb);

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
        });
      }
    }
  }

  // Initialize simplified order
  // Assuming no tax/discount logic for empty order, but if items exist we should calc.
  // For simplicity, we create basic PENDING order.

  const newOrder = new Order({
    restaurantId: `restaurant_${req.restaurantId}`,
    customerId: req.user._id,
    tableNumber: tableNumber.toString(),
    serverName: req.user.name,
    orderItems,
    subtotal,
    orderFinalCharge: subtotal, // Basic calc, assuming no tax/discount yet
    orderStatus: ORDER_STATUS.PENDING,
    // ... other defaults
  });

  const savedOrder = await newOrder.save();

  // If items were added, run recalculate (taxes are derived from items now)
  if (items.length > 0) {
    const reCalced = await recalculateOrderTotals(savedOrder, req.restaurantDb);
    await reCalced.save();
  }

  res.status(HTTP_STATUS.CREATED).json({
    status: "success",
    data: savedOrder,
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
    });
  }

  // Recalculate
  await recalculateOrderTotals(order, req.restaurantDb);

  // Update status to CONFIRMED or ONGOING if it was PENDING?
  if (order.orderStatus === ORDER_STATUS.PENDING) {
    order.orderStatus = ORDER_STATUS.CONFIRMED; // Now it has items and is "live"
  }

  const saved = await order.save();

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: saved,
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
  } else {
    order.payment.paymentStatus = PAYMENT_STATUS.PARTIALLY_PAID;
    // Do NOT close table if partially paid
  }

  const saved = await order.save();

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: saved,
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

  // Find and delete the order
  await Order.findByIdAndDelete(orderId);

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Dine-in order removed successfully",
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
    (i) => i._id.toString() === itemId || (i.item && i.item.toString() === itemId)
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

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Item removed from order",
    data: order,
  });
});

module.exports = {
  getTablesStatus,
  createDineInOrder,
  addItemsToOrder,
  completeDineInCheckout,
  removeDineInOrder,
  removeOrderItem,
};
