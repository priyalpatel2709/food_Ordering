const asyncHandler = require("express-async-handler");
const {
  getCashRegisterModel,
  getCashSessionModel,
  getUserModel,
} = require("../../models/index");
const { HTTP_STATUS } = require("../../utils/const");

/**
 * @desc    Create a new cash register
 * @route   POST /api/v1/restaurant/cash-register
 */
const createRegister = asyncHandler(async (req, res) => {
  const CashRegister = getCashRegisterModel(req.restaurantDb);
  const { name } = req.body;

  if (!name) {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: "Register name is required" });
  }

  const register = await CashRegister.create({
    name,
    restaurantId: `restaurant_${req.restaurantId}`,
    status: "closed",
  });

  res.status(HTTP_STATUS.CREATED).json({
    status: "success",
    data: register,
  });
});

/**
 * @desc    Open a cash session
 * @route   POST /api/v1/restaurant/cash-register/:id/open
 */
const openSession = asyncHandler(async (req, res) => {
  const CashRegister = getCashRegisterModel(req.restaurantDb);
  const CashSession = getCashSessionModel(req.restaurantDb);
  const { openingBalance, notes } = req.body;

  const register = await CashRegister.findById(req.params.id);
  if (!register) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ message: "Register not found" });
  }

  if (register.status === "open") {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: "Register is already open" });
  }

  const today = new Date().toISOString().split("T")[0];

  const session = await CashSession.create({
    registerId: register._id,
    openedBy: req.user._id,
    openingBalance: Number(openingBalance) || 0,
    openingNotes: notes,
    businessDate: today,
    status: "open",
  });

  register.status = "open";
  register.currentSession = session._id;
  await register.save();

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: session,
  });
});

/**
 * @desc    Add a transaction to current session
 * @route   POST /api/v1/restaurant/cash-register/:id/transaction
 */
const addTransaction = asyncHandler(async (req, res) => {
  const CashRegister = getCashRegisterModel(req.restaurantDb);
  const CashSession = getCashSessionModel(req.restaurantDb);
  const { type, amount, reason } = req.body;

  const register = await CashRegister.findById(req.params.id).populate(
    "currentSession",
  );
  if (!register || !register.currentSession || register.status !== "open") {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: "Register is not open or session not found" });
  }

  const session = register.currentSession;
  const transaction = {
    type,
    amount: Number(amount),
    reason,
    performedBy: req.user._id,
    timestamp: new Date(),
  };

  session.transactions.push(transaction);

  // Update totals
  if (type === "pay_in" || type === "cash_in")
    session.totalPayIns += Number(amount);
  if (type === "pay_out" || type === "cash_out")
    session.totalPayOuts += Number(amount);

  await session.save();

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: session,
  });
});

/**
 * @desc    Close a cash session
 * @route   POST /api/v1/restaurant/cash-register/:id/close
 */
const closeSession = asyncHandler(async (req, res) => {
  const CashRegister = getCashRegisterModel(req.restaurantDb);
  const CashSession = getCashSessionModel(req.restaurantDb);
  const { actualCash, notes } = req.body;

  const register = await CashRegister.findById(req.params.id).populate({
    path: "currentSession",
    model: CashSession,
  });
  if (!register || !register.currentSession || register.status !== "open") {
    return res
      .status(HTTP_STATUS.BAD_REQUEST)
      .json({ message: "Register is not open" });
  }

  const session = register.currentSession;

  // Calculate expected closing balance
  const expectedBalance =
    session.openingBalance +
    session.totalSales +
    session.totalPayIns -
    session.totalRefunds -
    session.totalPayOuts;

  session.status = "closed";
  session.closedBy = req.user._id;
  session.closedAt = new Date();
  session.closingBalance = expectedBalance;
  session.actualCash = Number(actualCash);
  session.closingNotes = notes;
  await session.save();

  register.status = "closed";
  register.currentSession = null;
  await register.save();

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Register closed successfully",
    data: {
      expectedBalance,
      actualCash: session.actualCash,
      difference: session.actualCash - expectedBalance,
      session,
    },
  });
});

/**
 * @desc    Get all registers
 * @route   GET /api/v1/restaurant/cash-register
 */
const getAllRegisters = asyncHandler(async (req, res) => {
  try {
    const CashRegister = getCashRegisterModel(req.restaurantDb);
    const CashSession = getCashSessionModel(req.restaurantDb);
    const registers = await CashRegister.find().populate({
      path: "currentSession",
      model: CashSession,
    });

    res.status(HTTP_STATUS.OK).json({
      status: "success",
      data: registers,
    });
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      status: "error",
      message: "Failed to fetch registers",
    });
  }
});

/**
 * @desc    Get session history for a register
 * @route   GET /api/v1/restaurant/cash-register/:id/history
 */
const getRegisterHistory = asyncHandler(async (req, res) => {
  const CashSession = getCashSessionModel(req.restaurantDb);
  const User = getUserModel(req.user);
  const { startDate, endDate } = req.query;

  let query = {
    registerId: req.params.id,
  };

  if (startDate || endDate) {
    query.businessDate = {};
    if (startDate) query.businessDate.$gte = startDate;
    if (endDate) query.businessDate.$lte = endDate;
  }

  const sessions = await CashSession.find(query)
    .sort({ openedAt: -1 })
    .populate({
      path: "openedBy",
      model: User,
      select: "name",
    })
    .populate({
      path: "closedBy",
      model: User,
      select: "name",
    });

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: sessions,
  });
});

/**
 * Helper to record a sale in the active cash register session
 */
const recordCashSale = async ({
  restaurantDb,
  restaurantId,
  amount,
  orderId,
  performedBy,
}) => {
  const CashRegister = getCashRegisterModel(restaurantDb);
  const CashSession = getCashSessionModel(restaurantDb);

  // Find first open register for this restaurant
  const register = await CashRegister.findOne({
    restaurantId,
    status: "open",
  }).populate("currentSession");

  if (register && register.currentSession) {
    const session = register.currentSession;
    session.transactions.push({
      type: "sale",
      amount: Number(amount),
      reason: `Order Payment (${orderId})`,
      orderId: orderId,
      performedBy: performedBy,
      timestamp: new Date(),
    });

    session.totalSales = (session.totalSales || 0) + Number(amount);
    await session.save();
    return true;
  }
  return false;
};

module.exports = {
  createRegister,
  openSession,
  addTransaction,
  closeSession,
  getAllRegisters,
  getRegisterHistory,
  recordCashSale,
};
