const mongoose = require("mongoose");

const discountSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    type: { type: String, enum: ["percentage", "fixed"], required: true }, // Type of discount
    value: { type: Number, required: true, min: 0 }, // Discount value (fixed or percentage)
    validFrom: { type: Date }, // Start date of discount
    validTo: { type: Date }, // End date of discount
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const getDiscountModel = (connection) => {
  return connection.model("Discount", discountSchema);
};

module.exports = getDiscountModel;
