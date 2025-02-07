const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
    },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number }, // Sorting order
  },
  { timestamps: true }
);

const getCategoryModel = (connection) => {
  return connection.model("Category", categorySchema);
};

module.exports = getCategoryModel;
