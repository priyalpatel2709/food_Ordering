const mongoose = require("mongoose");

const restaurantModel = new mongoose.Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    operatingHours: {
      type: Map,
      of: {
        openTime: { type: String, required: true },
        closeTime: { type: String, required: true },
      },
    },
    phone: { type: String },
    email: { type: String },
    image: { type: String },
    restaurantId: { type: String, required: true, unique: true },
    isActive: { type: Boolean, default: true },
    latitude: { type: Number },
    longitude: { type: Number },
    cuisineType: [{ type: String }],
    capacity: { type: Number },
    isVegetarianFriendly: { type: Boolean, default: false },
    hasParking: { type: Boolean, default: false },
    specialHours: {
      type: Map,
      of: {
        openTime: { type: String },
        closeTime: { type: String },
      },
    },
    averageRating: { type: Number, default: 0 },
    acceptsOnlineOrders: { type: Boolean, default: false },
    acceptsReservations: { type: Boolean, default: false },
    paymentMethods: [{ type: String }],
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
    tableConfiguration: {
      totalTables: { type: Number, default: 0 },
    },
    kdsConfiguration: {
      workflow: [{ type: String }], // e.g., ["new", "start", "prepared", "ready"]
    },
  },
  { timestamps: true }
);

const getRestaurantModel = (connection) => {
  return connection.model("Restaurant", restaurantModel);
};

module.exports = getRestaurantModel;
