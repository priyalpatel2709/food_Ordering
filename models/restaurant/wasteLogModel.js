const mongoose = require("mongoose");

const wasteLogSchema = new mongoose.Schema(
    {
        restaurantId: { type: String, required: true },
        itemId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Item",
            required: true,
        },
        quantity: { type: Number, required: true, min: 1 },
        reason: {
            type: String,
            enum: ["expired", "mishap", "complaint", "refusal", "other"],
            required: true,
        },
        note: { type: String },
        costPerUnit: { type: Number, default: 0 },
        totalLoss: { type: Number, default: 0 },
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    { timestamps: true }
);

wasteLogSchema.pre("save", function (next) {
    this.totalLoss = this.quantity * this.costPerUnit;
    next();
});

const getWasteLogModel = (connection) => {
    return connection.model("WasteLog", wasteLogSchema);
};

module.exports = getWasteLogModel;
