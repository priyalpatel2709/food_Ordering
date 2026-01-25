const asyncHandler = require("express-async-handler");
const {
  getOrderModel,
  getRestaurantModel,
  getMenuModel,
} = require("../../models/index");
const { ORDER_STATUS, HTTP_STATUS } = require("../../utils/const");
const { logger } = require("../../middleware/loggingMiddleware");

/**
 * Scan QR Code - Get Table & Restaurant Info
 * GET /api/v1/customer/dine-in/scan?restaurantId=123&tableNumber=5
 * This is public (no authentication required)
 */
const scanTableQRCode = asyncHandler(async (req, res) => {
  const { restaurantId, tableNumber } = req.query;

  if (!restaurantId || !tableNumber) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: "Restaurant ID and Table Number are required" });
  }

  const { getTableModel } = require("../../models/index");
  const Table = getTableModel(req.restaurantDb);
  const Restaurant = getRestaurantModel(req.restaurantDb);

  const [restaurantDoc, tableDoc] = await Promise.all([
    Restaurant.findOne({ restaurantId: `restaurant_${restaurantId}` }),
    Table.findOne({ tableNumber: tableNumber.toString() }),
  ]);

  if (!restaurantDoc) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ message: "Restaurant not found" });
  }

  if (!tableDoc) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ message: "Table not found" });
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: {
      restaurant: {
        name: restaurantDoc.name,
        image: restaurantDoc.image,
        cuisineType: restaurantDoc.cuisineType,
      },
      table: {
        id: tableDoc._id,
        number: tableDoc.tableNumber,
        status: tableDoc.status,
        seatingCapacity: tableDoc.seatingCapacity,
        currentOrderId: tableDoc.currentOrderId,
      },
    },
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
    path: "categories",
    populate: {
      path: "items",
      match: { isActive: true },
    },
  });

  if (!menu) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ message: "No active menu found" });
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: menu,
  });
});

/**
 * Get Active Table Order (Bill View)
 * GET /api/v1/customer/dine-in/order/:orderId
 */
const getActiveTableOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const Order = getOrderModel(req.restaurantDb);

  const order = await Order.findById(orderId).populate([
    { path: "orderItems.item" },
    { path: "tax.taxes.taxId" },
    { path: "discount.discounts.discountId" },
  ]);

  if (!order) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ status: "error", message: "Order not found" });
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: order,
  });
});

module.exports = {
  scanTableQRCode,
  getTableMenu,
  getActiveTableOrder,
};
