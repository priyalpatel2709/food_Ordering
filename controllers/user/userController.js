const asyncHandler = require("express-async-handler");
const generateToken = require("../../config/generateToken");
const crudOperations = require("../../utils/crudOperations");
const {
  getUserModel,
  getOrderModel,
  getOrderTypeModel,
  getItemModel,
  getPermissionModel,
  getRoleModel,
} = require("../../models");
const createError = require("http-errors");

const registerUser = asyncHandler(async (req, res, next) => {
  try {
    const { email, restaurantId, ...user } = req.body;
    const User = getUserModel(req.usersDb);

    // Check if restaurantId is provided
    if (!restaurantId) {
      throw createError(400, "restaurantId ID must be provided");
    }

    // Check if user with the same email already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      throw createError(400, "User already exists");
    }

    // Create new user
    const newUser = await User.create({
      email,
      restaurantId,
      roleName: "customer",
      ...user,
    });

    // Return user info and generated token
    res.status(201).json({
      ...newUser._doc,
      token: generateToken(newUser._id, restaurantId),
      // _id: newUser._id,
      // name: newUser.name,
      // email: newUser.email,
      // token: generateToken(newUser._id, restaurantId),
      // restaurantId: newUser.restaurantId,
      // role: newUser.roleName,
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
  const Role = getRoleModel(req.usersDb);
  const Permission = getPermissionModel(req.usersDb);

  // Find user by email
  const user = await User.findOne({ email })
    .populate({
      path: "roles",
      model: Role,
      populate: {
        path: "permissions",

        model: Permission,
      },
    })
    .select("-password -__v")
    .lean();

  // Validate user credentials
  if (
    !user
    // || !(await user.matchPassword(password))
  ) {
    throw createError(401, "Invalid email or password");
  }

  // Return user info and generated token
  res.json({ ...user, token: generateToken(user._id, user.restaurantId) });
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

const getUsersByRestaurantId = asyncHandler(async (req, res, next) => {
  const User = getUserModel(req.usersDb);
  const Role = getRoleModel(req.usersDb);
  const Permission = getPermissionModel(req.usersDb);

  const restaurantId = req.user.restaurantId;

  if (!restaurantId) {
    return res.status(400).json({ message: "restaurantId is required" });
  }

  // 🔒 Tenant isolation
  // if (req.user.restaurantId !== restaurantId) {
  //   return res.status(403).json({ message: "Forbidden" });
  // }

  const users = await User.find(
    { restaurantId },
    {
      password: 0,
      refreshToken: 0,
      __v: 0,
    },
  )
    .populate({
      path: "roles",
      select: "name isSystem permissions",
      populate: {
        path: "permissions",
        select: "name module description",
        model: Permission,
      },
      model: Role,
    })
    .lean();

  // ✅ Empty list is valid
  res.status(200).json({
    status: "success",
    count: users.length,
    data: users,
  });
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
  getUsersByRestaurantId,
  getAllOrders,
};
