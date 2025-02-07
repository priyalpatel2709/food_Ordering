const mongoose = require("mongoose");

const itemSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
    },
    categoryId: {
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
    isVegetarian: { type: Boolean, default: false },
    isSpicy: { type: Boolean, default: false },
    allergens: [{ type: String }], // E.g., "Peanuts", "Gluten"
    customizationOptions: [
      { type: mongoose.Schema.Types.ObjectId, ref: "CustomizationOption" },
    ],
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
