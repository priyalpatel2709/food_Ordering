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
    categoryImage: { type: String },
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

const getCategoryModel = (connection) => {
  return connection.model("Category", categorySchema);
};

module.exports = getCategoryModel;
