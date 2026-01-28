const asyncHandler = require("express-async-handler");
const { getCashRegisterModel, getCashSessionModel } = require("../../models/index");
const { HTTP_STATUS } = require("../../utils/const");

/**
 * @desc    Create a new cash register
 * @route   POST /api/v1/restaurant/cash-register
 */
const createRegister = asyncHandler(async (req, res) => {
    const CashRegister = getCashRegisterModel(req.restaurantDb);
    const { name } = req.body;

    if (!name) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Register name is required" });
    }

    const register = await CashRegister.create({
        name,
        restaurantId: req.restaurantId,
        status: "closed"
    });

    res.status(HTTP_STATUS.CREATED).json({
        status: "success",
        data: register
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
        return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Register not found" });
    }

    if (register.status === "open") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Register is already open" });
    }

    const session = await CashSession.create({
        openedBy: req.user._id,
        openingBalance: Number(openingBalance) || 0,
        openingNotes: notes,
        status: "open",
    });

    register.status = "open";
    register.currentSession = session._id;
    await register.save();

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: session
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

    const register = await CashRegister.findById(req.params.id).populate("currentSession");
    if (!register || !register.currentSession || register.status !== "open") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Register is not open or session not found" });
    }

    const session = register.currentSession;
    const transaction = {
        type,
        amount: Number(amount),
        reason,
        performedBy: req.user._id,
        timestamp: new Date()
    };

    session.transactions.push(transaction);

    // Update totals
    if (type === "pay_in" || type === "cash_in") session.totalPayIns += Number(amount);
    if (type === "pay_out" || type === "cash_out") session.totalPayOuts += Number(amount);

    await session.save();

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: session
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

    const register = await CashRegister.findById(req.params.id).populate("currentSession");
    if (!register || !register.currentSession || register.status !== "open") {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Register is not open" });
    }

    const session = register.currentSession;

    // Calculate expected closing balance
    const expectedBalance = session.openingBalance + session.totalSales + session.totalPayIns - session.totalRefunds - session.totalPayOuts;

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
            session
        }
    });
});

/**
 * @desc    Get all registers
 * @route   GET /api/v1/restaurant/cash-register
 */
const getAllRegisters = asyncHandler(async (req, res) => {
    const CashRegister = getCashRegisterModel(req.restaurantDb);
    const registers = await CashRegister.find({ restaurantId: req.restaurantId }).populate("currentSession");

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: registers
    });
});

module.exports = {
    createRegister,
    openSession,
    addTransaction,
    closeSession,
    getAllRegisters
};
