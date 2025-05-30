const mongoose = require("mongoose");

const refundSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
    //   required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    reason: {
      type: String,
      trim: true,
    },
    processedAt: {
      type: Date,
      default: Date.now,
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    refundId: {
      type: String,
      unique: true,
    //   required: true,
      trim: true,
    },
    metaData: [
      {
        key: { type: String, trim: true },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
    versionKey: false,
    strict: true,
  }
);

// Optional: Pre-save hook to ensure refundId format (e.g., UUID)
refundSchema.pre("save", function (next) {
  if (!this.refundId) {
    this.refundId = `refund_${new mongoose.Types.ObjectId().toString()}`;
  }
  next();
});

const getRefundModel = (connection) => {
  return connection.model("Refund", refundSchema);
};

module.exports = getRefundModel;
