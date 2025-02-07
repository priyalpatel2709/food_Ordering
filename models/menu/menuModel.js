const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    availableDays: [
      {
        type: String,
        enum: [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ],
      },
    ],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    taxes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tax" }],
    discounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Discount" }],
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

const getMenuModel = (connection) => {
  return connection.model("Menu", menuSchema);
};

module.exports = getMenuModel;
