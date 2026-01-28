const mongoose = require("mongoose");

const cashSessionSchema = new mongoose.Schema({
    openedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    openingBalance: {
        type: Number,
        required: true,
        default: 0,
    },
    openingNotes: String,
    openedAt: {
        type: Date,
        default: Date.now,
    },
    closedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
    closingBalance: Number, // Theoretical balance based on transactions
    actualCash: Number,    // Physically counted cash
    closingNotes: String,
    closedAt: Date,
    status: {
        type: String,
        enum: ["open", "closed"],
        default: "open",
    },
    transactions: [
        {
            type: {
                type: String,
                enum: ["cash_in", "cash_out", "pay_in", "pay_out", "sale", "refund"],
                required: true,
            },
            amount: {
                type: Number,
                required: true,
            },
            reason: String,
            orderId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Order",
            },
            timestamp: {
                type: Date,
                default: Date.now,
            },
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        }
    ],
    totalSales: { type: Number, default: 0 },
    totalRefunds: { type: Number, default: 0 },
    totalPayIns: { type: Number, default: 0 },
    totalPayOuts: { type: Number, default: 0 },
}, { timestamps: true });

const cashRegisterSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    status: {
        type: String,
        enum: ["open", "closed", "maintenance"],
        default: "closed",
    },
    currentSession: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CashSession",
    },
    restaurantId: {
        type: String,
        required: true,
    },
}, { timestamps: true });

// Function to get Model (Dynamic for Multi-tenancy)
const getCashRegisterModel = (connection) => {
    return connection.model("CashRegister", cashRegisterSchema);
};

const getCashSessionModel = (connection) => {
    return connection.model("CashSession", cashSessionSchema);
};

module.exports = {
    getCashRegisterModel,
    getCashSessionModel,
};
