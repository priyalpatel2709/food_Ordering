const mongoose = require("mongoose");

const orderTypeSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,

    },
    orderType: { type: String, required: true, unique: true },
    orderTypeNote: { type: String },
    isActive: { type: Boolean, default: true },
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

const getOrderTypeModel = (connection) => {
  return connection.model("OrderType", orderTypeSchema);
};

module.exports = getOrderTypeModel;
