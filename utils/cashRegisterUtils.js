const { getCashRegisterModel, getCashSessionModel } = require("../models/index");

/**
 * Record a cash sale transaction in the active cash session
 * @param {Object} restaurantDb 
 * @param {string} restaurantId 
 * @param {Number} amount 
 * @param {string} orderId 
 * @param {Object} user 
 * @param {string} [cashRegisterId] 
 */
const recordCashSale = async (restaurantDb, restaurantId, amount, orderId, user, cashRegisterId) => {
    const CashRegister = getCashRegisterModel(restaurantDb);
    const CashSession = getCashSessionModel(restaurantDb);

    let register;
    if (cashRegisterId) {
        register = await CashRegister.findById(cashRegisterId).populate("currentSession");
    } else {
        // Default to first open register for the restaurant if no ID provided
        register = await CashRegister.findOne({
            restaurantId,
            status: "open"
        }).populate("currentSession");
    }

    if (register && register.currentSession && register.status === "open") {
        const session = register.currentSession;
        session.transactions.push({
            type: "sale",
            amount: Number(amount),
            reason: `Order Sale #${orderId}`,
            orderId,
            performedBy: user?._id,
            timestamp: new Date()
        });

        session.totalSales += Number(amount);
        await session.save();
        return true;
    }
    return false;
};

/**
 * Record a cash refund transaction in the active cash session
 * @param {Object} restaurantDb 
 * @param {string} restaurantId 
 * @param {Number} amount 
 * @param {string} orderId 
 * @param {Object} user 
 */
const recordCashRefund = async (restaurantDb, restaurantId, amount, orderId, user) => {
    const CashRegister = getCashRegisterModel(restaurantDb);
    const CashSession = getCashSessionModel(restaurantDb);

    const register = await CashRegister.findOne({
        restaurantId,
        status: "open"
    }).populate("currentSession");

    if (register && register.currentSession && register.status === "open") {
        const session = register.currentSession;
        session.transactions.push({
            type: "refund",
            amount: Number(amount),
            reason: `Order Refund #${orderId}`,
            orderId,
            performedBy: user?._id,
            timestamp: new Date()
        });

        session.totalRefunds += Number(amount);
        await session.save();
        return true;
    }
    return false;
};

module.exports = {
    recordCashSale,
    recordCashRefund
};
