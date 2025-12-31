const asyncHandler = require("express-async-handler");
const {
    getOrderModel,
    getRestaurantModel,
    getMenuModel,
} = require("../../models/index");
const {
    ORDER_STATUS,
    HTTP_STATUS,
} = require("../../utils/const");
const { logger } = require("../../middleware/loggingMiddleware");

/**
 * Scan QR Code - Get Table & Restaurant Info
 * GET /api/v1/customer/dine-in/scan?restaurantId=123&tableNumber=5
 * This is public (no authentication required)
 */
const scanTableQRCode = asyncHandler(async (req, res) => {
    const { restaurantId, tableNumber } = req.query;

    if (!restaurantId || !tableNumber) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Restaurant ID and Table Number are required" });
    }

    const Restaurant = getRestaurantModel(req.restaurantDb);
    const restaurantDoc = await Restaurant.findOne({ restaurantId: `restaurant_${restaurantId}` });

    if (!restaurantDoc) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Restaurant not found" });
    }

    // Validate table number
    const totalTables = restaurantDoc.tableConfiguration?.totalTables || 0;
    if (parseInt(tableNumber) > totalTables || parseInt(tableNumber) < 1) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Invalid table number" });
    }

    const Order = getOrderModel(req.restaurantDb);

    // Check for any active order or group cart at this table
    const activeOrder = await Order.findOne({
        tableNumber: tableNumber.toString(),
        restaurantId: `restaurant_${restaurantId}`,
        orderStatus: { $in: [ORDER_STATUS.GROUP_CART, ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.SERVED] }
    }).select('orderStatus orderId customerId contactName');

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: {
            restaurant: {
                name: restaurantDoc.name,
                image: restaurantDoc.image,
                cuisineType: restaurantDoc.cuisineType,
            },
            table: {
                number: tableNumber,
                status: activeOrder ? (activeOrder.orderStatus === ORDER_STATUS.GROUP_CART ? 'session_active' : 'occupied') : 'available',
                currentOrderId: activeOrder ? activeOrder._id : null
            }
        }
    });
});

/**
 * Get Table Menu - Simplified for Customer
 * GET /api/v1/customer/dine-in/menu?restaurantId=123
 */
const getTableMenu = asyncHandler(async (req, res) => {
    const restaurantId = `restaurant_${req.restaurantId}`;
    const Menu = getMenuModel(req.restaurantDb);

    // Find the active menu for this restaurant
    const menu = await Menu.findOne({ restaurantId, isActive: true }).populate({
        path: 'categories',
        populate: {
            path: 'items',
            match: { isActive: true }
        }
    });

    if (!menu) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "No active menu found" });
    }

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: menu
    });
});

module.exports = {
    scanTableQRCode,
    getTableMenu
};
