const mongoose = require("mongoose");

const menuSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
    },
    name: { type: String, required: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    availableDays: [
      {
        day: {
          type: String,
          enum: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ],
        },
        timeSlots: [
          {
            openTime: { type: String, required: true }, // e.g., "08:00"
            closeTime: { type: String, required: true }, // e.g., "12:00"
          },
        ],
      },
    ],
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "Category" }],
    items: [
      {
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
          required: true,
        },
        defaultPrice: { type: Number, min: 0 },

        // Time-based and weekday pricing
        timeBasedPricing: [
          {
            days: [
              {
                type: String,
                enum: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                  "Sunday",
                ],
              },
            ],
            startTime: { type: String },
            endTime: { type: String },
            price: { type: Number, min: 0 },
          },
        ],

        // Seasonal pricing (holidays, festivals)
        specialEventPricing: [
          {
            event: { type: String }, // e.g., "Christmas"
            date: { type: String }, // e.g., "2025-12-25"
            priceMultiplier: { type: Number, min: 0 },
          },
        ],

        // Membership & Loyalty Discounts
        membershipPricing: [
          {
            membershipLevel: {
              type: String,
              enum: ["Standard", "Silver", "Gold", "Platinum"],
            },
            price: { type: Number, min: 0 },
          },
        ],

        // Bulk purchase discounts
        bulkPricing: [
          {
            minQuantity: { type: Number, min: 1 },
            discountPercentage: { type: Number, min: 0, max: 100 },
          },
        ],

        // Location-based pricing
        locationPricing: [
          {
            location: { type: String }, // e.g., "New York"
            price: { type: Number, min: 0 },
          },
        ],

        // Flash sales / limited-time pricing
        availabilityHours: {
          startTime: { type: String },
          endTime: { type: String },
        },

        // Combo meal deals
        comboPricing: [
          {
            comboName: { type: String },
            items: [{ type: mongoose.Schema.Types.ObjectId, ref: "Item" }],
            price: { type: Number, min: 0 },
          },
        ],

        // Service Charges & Additional Fees
        additionalFees: [
          {
            chargeType: { type: String, enum: ["Service Fee", "Delivery Fee"] },
            percentage: { type: Number, min: 0, max: 100 },
            applicableTo: [
              { type: String, enum: ["Dine In", "Takeaway", "Delivery"] },
            ],
          },
        ],
      },
    ],
    taxes: [{ type: mongoose.Schema.Types.ObjectId, ref: "Tax" }],
    discounts: [{ type: mongoose.Schema.Types.ObjectId, ref: "Discount" }],
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  { timestamps: true }
);

// menuSchema.pre("save", async function (next) {
//   for (let i = 0; i < this.items.length; i++) {
//     const itemData = await mongoose.model("Item").findById(this.items[i].item);
//     if (itemData) {
//       this.items[i].defaultPrice = itemData.price;
//     }
//   }
//   next();
// });

const getMenuModel = (connection) => {
  return connection.model("Menu", menuSchema);
};

module.exports = getMenuModel;
