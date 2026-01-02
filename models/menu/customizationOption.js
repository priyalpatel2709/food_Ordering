const mongoose = require("mongoose");

const customizationOptionSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
 
    },
    name: { type: String, required: true }, // Example: "Extra Cheese"
    price: { type: Number, default: 0, min: 0 }, // Additional price for customization
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

const getCustomizationOptionModel = (connection) => {
  return connection.model("CustomizationOption", customizationOptionSchema);
};

module.exports = getCustomizationOptionModel;
