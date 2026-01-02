const mongoose = require("mongoose");

const taxSchema = new mongoose.Schema(
  {
    restaurantId: { type: String,  },
    name: { type: String, required: true }, // Example: "VAT"
    percentage: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      validate: {
        validator: function (v) {
          return /^\d{1,2}(\.\d{1,4})?$/.test(v.toString()); // Allows up to 4 decimal places
        },
        message: (props) => `${props.value} is not a valid percentage!`,
      },
    }, // Tax percentage
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

const getTaxModel = (connection) => {
  return connection.model("Tax", taxSchema);
};

module.exports = getTaxModel;
