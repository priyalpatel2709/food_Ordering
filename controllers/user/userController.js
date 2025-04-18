const asyncHandler = require("express-async-handler");
const generateToken = require("../../config/generateToken");
const crudOperations = require("../../utils/crudOperations");
const {
  getUserModel,
  getOrderModel,
  getOrderTypeModel,
  getItemModel,
} = require("../../models");
const createError = require("http-errors");

const registerUser = asyncHandler(async (req, res, next) => {
  try {
    const { email, restaurantsId, ...user } = req.body;
    const User = getUserModel(req.usersDb);

    // Check if restaurantsId is provided
    if (!restaurantsId) {
      throw createError(400, "restaurantsId ID must be provided");
    }

    // Check if user with the same email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw createError(400, "User already exists");
    }

    // Create new user
    const newUser = await User.create({
      email,
      restaurantsId,
      ...user,
    });

    // Return user info and generated token
    res.status(201).json({
      _id: newUser._id,
      name: newUser.name,
      email: newUser.email,
      token: generateToken(newUser._id),
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === "ValidationError") {
      return next(createError(400, error.message));
    }
    // Handle other errors
    next(error);
  }
});

const authUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const User = getUserModel(req.usersDb);

  // Find user by email
  const user = await User.findOne({ email });

  // Validate user credentials
  if (!user) {
    throw createError(401, "Invalid email or password");
  }

  // Return user info and generated token
  res.json({
    _id: user._id,
    name: user.name,
    email: user.email,
    token: generateToken(user._id),
    restaurantsId: user.restaurantsId,
  });
});

const deleteById = asyncHandler(async (req, res, next) => {
  const User = getUserModel(req.usersDb);
  const roleOperations = crudOperations({
    mainModel: User,
  });
  roleOperations.deleteById(req, res, next);
});

const getAllUsers = asyncHandler(async (req, res, next) => {
  const User = getUserModel(req.usersDb);

  const roleOperations = crudOperations({
    mainModel: User,
  });
  roleOperations.getAll(req, res, next);
});

const getUsersByRestaurantsId = asyncHandler(async (req, res, next) => {
  try {
    const User = getUserModel(req.usersDb);
    const { restaurantsId } = req.params;

    // Validate restaurantsId
    if (!restaurantsId) {
      return res.status(400).json({ message: "restaurantsId is required" });
    }

    // Fetch users by restaurantsId
    const users = await User.find({ restaurantsId }).lean();

    // Check if no users are found
    if (users.length === 0) {
      return res
        .status(404)
        .json({ message: "No users found for this restaurant" });
    }

    // Return the found users
    res.status(200).json(users);
  } catch (error) {
    next(error); // Properly propagate the error to the error handler
  }
});

const getAllOrders = asyncHandler(async (req, res, next) => {
  try {
    const Order = getOrderModel(req.restaurantDb);
    const OrderType = getOrderTypeModel(req.restaurantDb);
    const Item = getItemModel(req.restaurantDb);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({
      customerId: req.user._id,
    });

    const userOrders = await Order.find({ customerId: req.user._id })
      .select("-tax.taxes -discount.discounts -customerId")
      .skip(skip)
      .limit(limit)
      .populate({
        path: "orderType",
        model: OrderType,
        select: "orderType",
      })
      .populate({
        path: "orderItems.item",
        model: Item,
        select: "name description image",
      })
      .lean();

    if (userOrders.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "No orders found for this user",
      });
    }

    res.status(200).json({
      status: "success",
      total: totalOrders,
      page,
      limit,
      data: userOrders,
    });
  } catch (error) {
    console.error("Error in getAllOrders:", error);
    next(createError(500, "Failed to fetch orders", { error: error.message }));
  }
});

module.exports = {
  registerUser,
  authUser,
  deleteById,
  getAllUsers,
  getUsersByRestaurantsId,
  getAllOrders,
};
