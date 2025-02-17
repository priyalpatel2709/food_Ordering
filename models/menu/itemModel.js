const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
    isAvailable: { type: Boolean, default: true },
    preparationTime: { type: Number, default: 10 },
    allergens: [{ type: String }], // E.g., "Peanuts", "Gluten"
    customizationOptions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "CustomizationOption" },
    ],
    popularityScore: { type: Number, default: 0 },
    averageRating: { type: Number, min: 0, max: 5 },
    taxable: { type: Boolean, default: true },
    taxRate: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tax" }],
    minOrderQuantity: { type: Number, min: 1, default: 1 },
    maxOrderQuantity: { type: Number, min: 1 },
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

const getItemModel = (connection) => {
  return connection.model("Item", itemSchema);
};

module.exports = getItemModel;
