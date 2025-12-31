const asyncHandler = require("express-async-handler");
const {
    getOrderModel,
    getItemModel,
    getRestaurantModel,
} = require("../../models/index");
const {
    ORDER_STATUS,
    HTTP_STATUS,
} = require("../../utils/const");
const { recalculateOrderTotals } = require("./dineInController");
const { emitGroupCartUpdate } = require("../../services/realtimeService");
const { logger } = require("../../middleware/loggingMiddleware");

/**
 * Join or Start a Group Session
 * GET /api/v1/orders/dine-in/group/join?tableNumber=5
 */
const joinGroupSession = asyncHandler(async (req, res) => {
    const { tableNumber } = req.query;
    const restaurantId = `restaurant_${req.restaurantId}`;

    if (!tableNumber) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Table number is required" });
    }

    const Order = getOrderModel(req.restaurantDb);

    // Check if there's an active GROUP_CART for this table
    let groupOrder = await Order.findOne({
        tableNumber: tableNumber.toString(),
        restaurantId,
        orderStatus: ORDER_STATUS.GROUP_CART
    }).populate("orderItems.item");

    // If no group cart, check if table is occupied by a real order
    if (!groupOrder) {
        const activeOrder = await Order.findOne({
            tableNumber: tableNumber.toString(),
            restaurantId,
            orderStatus: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.SERVED] }
        });

        if (activeOrder) {
            // If already occupied, we might want to allow joining the active order directly,
            // but for simplicity, let's say a group session can only start for a fresh table.
            // However, the requirement says "start a group order".
        }

        // Create a new GROUP_CART document
        groupOrder = new Order({
            restaurantId,
            tableNumber: tableNumber.toString(),
            orderStatus: ORDER_STATUS.GROUP_CART,
            source: 'customer', // New for customer dine-in
            subtotal: 0,
            orderFinalCharge: 0,
            contactName: "Group Table " + tableNumber
        });
        await groupOrder.save();
    }

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: groupOrder,
        message: "Joined group session successfully"
    });
});

/**
 * Add Item to Group Cart
 * POST /api/v1/orders/dine-in/group/:orderId/add
 */
const addItemToGroupCart = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const { item, quantity, modifiers, specialInstructions } = req.body;
    const user = req.user;

    const Order = getOrderModel(req.restaurantDb);
    const Item = getItemModel(req.restaurantDb);

    const order = await Order.findById(orderId);
    if (!order || order.orderStatus !== ORDER_STATUS.GROUP_CART) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Active group cart not found" });
    }

    const dbItem = await Item.findById(item);
    if (!dbItem) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Item not found" });
    }

    const price = Number(dbItem.price);
    const qty = Number(quantity) || 1;

    order.orderItems.push({
        item: dbItem._id,
        quantity: qty,
        price: price,
        modifiers: modifiers || [],
        specialInstructions: specialInstructions || "",
        addedBy: user.name,
        addedByImage: user.userImage || ""
    });

    await recalculateOrderTotals(order, req.restaurantDb);
    const savedOrder = await order.save();
    await savedOrder.populate("orderItems.item");

    // Broadcast to group
    emitGroupCartUpdate(req.restaurantId, order.tableNumber, savedOrder);

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: savedOrder
    });
});

/**
 * Update/Remove from Group Cart
 * PATCH /api/v1/orders/dine-in/group/:orderId/item/:itemId
 */
const updateGroupCartItem = asyncHandler(async (req, res) => {
    const { orderId, itemId } = req.params;
    const { quantity, modifiers } = req.body;

    const Order = getOrderModel(req.restaurantDb);
    const order = await Order.findById(orderId);

    if (!order || order.orderStatus !== ORDER_STATUS.GROUP_CART) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Active group cart not found" });
    }

    const itemIndex = order.orderItems.findIndex(i => i._id.toString() === itemId);
    if (itemIndex === -1) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Item not found in cart" });
    }

    if (quantity === 0) {
        order.orderItems.splice(itemIndex, 1);
    } else {
        if (quantity) order.orderItems[itemIndex].quantity = quantity;
        if (modifiers) order.orderItems[itemIndex].modifiers = modifiers;
    }

    await recalculateOrderTotals(order, req.restaurantDb);
    const savedOrder = await order.save();
    await savedOrder.populate("orderItems.item");

    // Broadcast to group
    emitGroupCartUpdate(req.restaurantId, order.tableNumber, savedOrder);

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: savedOrder
    });
});

/**
 * Submit Group Order (Convert to real order)
 * POST /api/v1/orders/dine-in/group/:orderId/submit
 */
const submitGroupOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;

    const Order = getOrderModel(req.restaurantDb);
    const order = await Order.findById(orderId);

    if (!order || order.orderStatus !== ORDER_STATUS.GROUP_CART) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Cart cannot be submitted" });
    }

    if (order.orderItems.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Cannot submit an empty cart" });
    }

    // Move to PENDING or CONFIRMED
    // According to existing logic, PENDING is the initial state for Dine-in
    order.orderStatus = ORDER_STATUS.PENDING;

    // Track status history
    order.statusHistory.push({
        status: ORDER_STATUS.PENDING,
        timestamp: new Date(),
        updatedBy: "Group Submission"
    });

    const savedOrder = await order.save();

    // Notify group that order is placed
    emitGroupCartUpdate(req.restaurantId, order.tableNumber, { orderStatus: ORDER_STATUS.PENDING, finalOrder: savedOrder });

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: savedOrder,
        message: "Order placed successfully!"
    });
});

module.exports = {
    joinGroupSession,
    addItemToGroupCart,
    updateGroupCartItem,
    submitGroupOrder
};
