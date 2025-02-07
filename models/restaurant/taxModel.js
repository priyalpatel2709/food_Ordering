const mongoose = require("mongoose");

const taxSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    name: { type: String, required: true }, // Example: "VAT"
    percentage: { type: Number, required: true, min: 0 }, // Tax percentage
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const getTaxModel = (connection) => {
  return connection.model("Tax", taxSchema);
};

module.exports = getTaxModel;
