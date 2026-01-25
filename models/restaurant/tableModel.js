const mongoose = require("mongoose");

const tableSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
    },
    tableNumber: { type: String, required: true },
    seatingCapacity: { type: Number, default: 2 },
    status: {
      type: String,
      enum: ["available", "occupied", "ongoing", "reserved", "cleaning"],
      default: "available",
    },
    currentOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
    },
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true },
);

const getTableModel = (connection) => {
  return connection.model("Table", tableSchema);
};

module.exports = getTableModel;
