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
        const discountPrice =
          orderItem.price && orderItem.price !== price
            ? Number(price - orderItem.price)
            : 0;

        // Add to subtotal
        subtotal += price * quantity;

        // Return processed item
        return {
          ...orderItem,
          item: item._id,
          price,
          discountPrice,
          quantity,
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
        ((subtotal * taxDoc.percentage) / 100).toFixed(2)
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
      ).toFixed(2)
    );

    // Create order object
    const orderData = {
      ...req.body,
      customerId: req.user._id,
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
      {
        field: "refunds.history.processedBy",
        model: User,
        select: "name email",
      },
    ],
  });
  orderOperations.getAll(req, res, next);
});

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
  const orderOperations = crudOperations({ mainModel: Order });
  orderOperations.updateById(req, res, next);
});

const deleteAll = asyncHandler(async (req, res, next) => {
  const Order = getOrderModel(req.restaurantDb);
  const orderOperations = crudOperations({ mainModel: Order });
  orderOperations.deleteAll(req, res, next);
});

module.exports = {
  createOrder,
  getAllOrders,
  getOrderById,
  deleteById,
  updateById,
  deleteAll,
};
