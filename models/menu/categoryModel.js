const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
    },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    displayOrder: { type: Number }, // Sorting order
    color: { type: String, default: "#000000" }, // For category UI color
    categoryImage: { type: String },
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true },
);

const getCategoryModel = (connection) => {
  return connection.model("Category", categorySchema);
};

module.exports = getCategoryModel;
