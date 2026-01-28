const asyncHandler = require("express-async-handler");
const { getCustomerLoyaltyModel, getUserModel } = require("../../models/index");
const { HTTP_STATUS } = require("../../utils/const");

/**
 * Create or Update Customer Loyalty Profile
 * POST /api/v1/loyalty/customers
 */
const createOrUpdateCustomer = asyncHandler(async (req, res) => {
  const {
    userId,
    phone,
    email,
    name,
    dateOfBirth,
    anniversary,
    preferences,
    marketing,
  } = req.body;

  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);

  // Check if customer already exists
  let customer = await CustomerLoyalty.findOne({
    // restaurantId: req.restaurantId,
    phone,
  });

  if (customer) {
    // Update existing customer
    if (email) customer.email = email;
    if (name) customer.name = name;
    if (dateOfBirth) customer.dateOfBirth = new Date(dateOfBirth);
    if (anniversary) customer.anniversary = new Date(anniversary);
    if (preferences)
      customer.preferences = { ...customer.preferences, ...preferences };
    if (marketing) customer.marketing = { ...customer.marketing, ...marketing };

    await customer.save();

    return res.status(HTTP_STATUS.OK).json({
      status: "success",
      message: "Customer profile updated",
      data: customer,
    });
  }

  // Create new customer
  customer = new CustomerLoyalty({
    // userId,
    // restaurantId: req.restaurantId,
    phone,
    email,
    name,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    anniversary: anniversary ? new Date(anniversary) : undefined,
    preferences: preferences || {},
    marketing: marketing || {},
  });

  // Generate referral code
  await customer.generateReferralCode();

  res.status(HTTP_STATUS.CREATED).json({
    status: "success",
    message: "Customer profile created",
    data: customer,
  });
});

/**
 * Get Customer by Smart Identifier (ID, Phone, Email, or Name)
 * Staff can search using any fragment of customer details
 * GET /api/v1/loyalty/customers/:identifier
 */
const getCustomer = asyncHandler(async (req, res) => {
  const { identifier } = req.params;
  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);

  let customer;

  // 1. Try Precise ID search first (if it matches MongoDB ObjectId format)
  if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
    customer = await CustomerLoyalty.findById(identifier).populate(
      "userId",
      "name email",
    );
    if (customer) {
      return res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: customer,
      });
    }
  }

  // 2. Smart Search (Exact match priority, then partial regex)
  // We search across Phone, Email, and Name simultaneously
  const searchFilter = {
    // restaurantId: req.restaurantId, // Optional: Filter by tenant if required
    $or: [
      { phone: identifier }, // Exact phone
      { email: identifier }, // Exact email
      { name: { $regex: identifier, $options: "i" } }, // Partial name
      { phone: { $regex: identifier, $options: "i" } }, // Partial phone
      { email: { $regex: identifier, $options: "i" } }, // Partial email
    ],
  };

  // Find the best match - if multiple, return the one with the highest spending/visits
  customer = await CustomerLoyalty.findOne(searchFilter)
    .sort({ "visitStats.totalSpent": -1, "visitStats.totalVisits": -1 })
    .populate("userId", "name email");

  if (!customer) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: `No customer found matching "${identifier}"`,
    });
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: customer,
  });
});

/**
 * Get All Customers with Filtering
 * GET /api/v1/loyalty/customers?tier=gold&status=active&segment=vip
 */
const getAllCustomers = asyncHandler(async (req, res) => {
  const {
    tier,
    status,
    segment,
    tag,
    search,
    page = 1,
    limit = 50,
  } = req.query;
  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);

  const filter = {};

  if (tier) filter.loyaltyTier = tier;
  if (status) filter.status = status;
  if (segment) filter.segments = segment;
  if (tag) filter.tags = tag;

  // Search by name, phone, or email
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { phone: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const skip = (page - 1) * limit;

  const [customers, total] = await Promise.all([
    CustomerLoyalty.find(filter)
      .sort({ "visitStats.totalSpent": -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("userId", "name email"),
    CustomerLoyalty.countDocuments(filter),
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    results: customers.length,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
    data: customers,
  });
});

/**
 * Add Loyalty Points
 * POST /api/v1/loyalty/customers/:id/points
 */
const addPoints = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { points, reason } = req.body;

  if (!points || points <= 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: "Points must be a positive number",
    });
  }

  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);
  const customer = await CustomerLoyalty.findById(id);

  if (!customer) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Customer not found",
    });
  }

  await customer.addPoints(points, reason);

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: `Added ${points} points`,
    data: {
      currentPoints: customer.loyaltyPoints.current,
      lifetimePoints: customer.loyaltyPoints.lifetime,
      tier: customer.loyaltyTier,
    },
  });
});

/**
 * Redeem Loyalty Points
 * POST /api/v1/loyalty/customers/:id/redeem
 */
const redeemPoints = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { points } = req.body;

  if (!points || points <= 0) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: "Points must be a positive number",
    });
  }

  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);
  const customer = await CustomerLoyalty.findById(id);

  if (!customer) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Customer not found",
    });
  }

  try {
    await customer.redeemPoints(points);

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      message: `Redeemed ${points} points`,
      data: {
        currentPoints: customer.loyaltyPoints.current,
        redeemedPoints: customer.loyaltyPoints.redeemed,
      },
    });
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: error.message,
    });
  }
});

/**
 * Record a Visit
 * POST /api/v1/loyalty/customers/:id/visit
 */
const recordVisit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { orderAmount } = req.body;

  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);
  const customer = await CustomerLoyalty.findById(id);

  if (!customer) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Customer not found",
    });
  }

  await customer.recordVisit(orderAmount);

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Visit recorded",
    data: customer.visitStats,
  });
});

/**
 * Get Loyalty Statistics
 * GET /api/v1/loyalty/stats
 */
const getLoyaltyStats = asyncHandler(async (req, res) => {
  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);

  const stats = await CustomerLoyalty.aggregate([
    { $match: { restaurantId: req.restaurantId } },
    {
      $facet: {
        tierDistribution: [
          {
            $group: {
              _id: "$loyaltyTier",
              count: { $sum: 1 },
              avgLifetimePoints: { $avg: "$loyaltyPoints.lifetime" },
              totalSpent: { $sum: "$visitStats.totalSpent" },
            },
          },
        ],
        statusDistribution: [
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ],
        topCustomers: [
          { $sort: { "visitStats.totalSpent": -1 } },
          { $limit: 10 },
          {
            $project: {
              name: 1,
              phone: 1,
              loyaltyTier: 1,
              totalSpent: "$visitStats.totalSpent",
              totalVisits: "$visitStats.totalVisits",
              currentPoints: "$loyaltyPoints.current",
            },
          },
        ],
        summary: [
          {
            $group: {
              _id: null,
              totalCustomers: { $sum: 1 },
              totalPointsIssued: { $sum: "$loyaltyPoints.lifetime" },
              totalPointsRedeemed: { $sum: "$loyaltyPoints.redeemed" },
              totalRevenue: { $sum: "$visitStats.totalSpent" },
              avgOrderValue: { $avg: "$visitStats.averageOrderValue" },
            },
          },
        ],
      },
    },
  ]);

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: stats[0],
  });
});

/**
 * Get Customers with Upcoming Birthdays/Anniversaries
 * GET /api/v1/loyalty/customers/upcoming-occasions?days=7
 */
const getUpcomingOccasions = asyncHandler(async (req, res) => {
  const { days = 7 } = req.query;
  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);

  const today = new Date();
  const futureDate = new Date();
  futureDate.setDate(today.getDate() + Number(days));

  const startMonth = today.getMonth() + 1;
  const startDay = today.getDate();

  const endMonth = futureDate.getMonth() + 1;
  const endDay = futureDate.getDate();

  let dateFilter;

  // ----------------------------
  // CASE 1: SAME MONTH
  // ----------------------------
  if (startMonth === endMonth) {
    dateFilter = {
      $or: [
        {
          $expr: {
            $and: [
              { $eq: [{ $month: "$dateOfBirth" }, startMonth] },
              { $gte: [{ $dayOfMonth: "$dateOfBirth" }, startDay] },
              { $lte: [{ $dayOfMonth: "$dateOfBirth" }, endDay] },
            ],
          },
        },
        {
          $expr: {
            $and: [
              { $eq: [{ $month: "$anniversary" }, startMonth] },
              { $gte: [{ $dayOfMonth: "$anniversary" }, startDay] },
              { $lte: [{ $dayOfMonth: "$anniversary" }, endDay] },
            ],
          },
        },
      ],
    };
  }

  // ----------------------------
  // CASE 2: FORWARD MULTI-MONTH (Feb → Mar)
  // ----------------------------
  else if (startMonth < endMonth) {
    dateFilter = {
      $or: [
        {
          $expr: {
            $or: [
              {
                $and: [
                  { $eq: [{ $month: "$dateOfBirth" }, startMonth] },
                  { $gte: [{ $dayOfMonth: "$dateOfBirth" }, startDay] },
                ],
              },
              {
                $and: [
                  { $eq: [{ $month: "$dateOfBirth" }, endMonth] },
                  { $lte: [{ $dayOfMonth: "$dateOfBirth" }, endDay] },
                ],
              },
            ],
          },
        },
        {
          $expr: {
            $or: [
              {
                $and: [
                  { $eq: [{ $month: "$anniversary" }, startMonth] },
                  { $gte: [{ $dayOfMonth: "$anniversary" }, startDay] },
                ],
              },
              {
                $and: [
                  { $eq: [{ $month: "$anniversary" }, endMonth] },
                  { $lte: [{ $dayOfMonth: "$anniversary" }, endDay] },
                ],
              },
            ],
          },
        },
      ],
    };
  }

  // ----------------------------
  // CASE 3: YEAR WRAP (Dec → Jan)
  // ----------------------------
  else {
    dateFilter = {
      $or: [
        {
          $expr: {
            $or: [
              {
                $and: [
                  { $eq: [{ $month: "$dateOfBirth" }, startMonth] },
                  { $gte: [{ $dayOfMonth: "$dateOfBirth" }, startDay] },
                ],
              },
              {
                $and: [
                  { $eq: [{ $month: "$dateOfBirth" }, endMonth] },
                  { $lte: [{ $dayOfMonth: "$dateOfBirth" }, endDay] },
                ],
              },
            ],
          },
        },
        {
          $expr: {
            $or: [
              {
                $and: [
                  { $eq: [{ $month: "$anniversary" }, startMonth] },
                  { $gte: [{ $dayOfMonth: "$anniversary" }, startDay] },
                ],
              },
              {
                $and: [
                  { $eq: [{ $month: "$anniversary" }, endMonth] },
                  { $lte: [{ $dayOfMonth: "$anniversary" }, endDay] },
                ],
              },
            ],
          },
        },
      ],
    };
  }

  const customers = await CustomerLoyalty.find({
    status: "active",
    ...dateFilter,
  });

  res.status(200).json({
    status: "success",
    results: customers.length,
    data: customers,
  });
});

/**
 * Add Customer Note
 * POST /api/v1/loyalty/customers/:id/notes
 */
const addNote = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { note } = req.body;

  const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);
  const customer = await CustomerLoyalty.findById(id);

  if (!customer) {
    return res.status(HTTP_STATUS.NOT_FOUND).json({
      status: "error",
      message: "Customer not found",
    });
  }

  customer.notes.push({
    note,
    addedBy: req.user._id,
    addedUserName: req.user.name,
    addedAt: new Date(),
  });

  await customer.save();

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Note added",
    data: customer.notes,
  });
});

module.exports = {
  createOrUpdateCustomer,
  getCustomer,
  getAllCustomers,
  addPoints,
  redeemPoints,
  recordVisit,
  getLoyaltyStats,
  getUpcomingOccasions,
  addNote,
};
