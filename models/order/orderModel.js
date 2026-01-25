const mongoose = require("mongoose");
const { generateQnicOrderId } = require("../../utils/utils");

const orderSchema = new mongoose.Schema(
  {
    restaurantId: {
      type: String,
      required: true,
    },
    orderId: { type: String, unique: true },
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    menuId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Menu",
    },
    orderNote: { type: String },
    orderType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "OrderType",
    },
    restaurantTipCharge: { type: Number, min: 0, default: 0 },
    isScheduledOrder: { type: Boolean, default: false },
    scheduledTime: { type: Date }, // Added for scheduled orders
    isDeliveryOrder: { type: Boolean, default: false },
    deliveryAddress: {
      // Added structured address for delivery
      street: { type: String },
      city: { type: String },
      state: { type: String },
      zipCode: { type: String },
      country: { type: String },
      addressType: { type: String },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
    },
    deliveryTipCharge: { type: Number, min: 0, default: 0 },
    deliveryCharge: { type: Number, min: 0, default: 0 },
    deliveryTimeEstimate: { type: Number }, // Added estimate in minutes
    subtotal: { type: Number, min: 0, required: true }, // Added as base price before taxes/fees
    // taxCharge: { type: Number, min: 0, default: 0 },
    tax: {
      taxes: [
        {
          taxId: { type: mongoose.Schema.Types.ObjectId, ref: "Tax" },
          taxCharge: { type: Number, min: 0, default: 0 },
        },
      ],
      totalTaxAmount: { type: Number, min: 0, default: 0 },
    },
    discount: {
      discounts: [
        {
          discountId: { type: mongoose.Schema.Types.ObjectId, ref: "Discount" },
          discountAmount: { type: Number, default: 0 },
        },
      ],
      totalDiscountAmount: { type: Number, min: 0, default: 0 },
    }, // Added for tracking applied codes
    orderFinalCharge: { type: Number, min: 0, required: true },
    paymentMethod: {
      // Added payment details
      type: { type: String, enum: ["credit", "debit", "cash", "online"] },
      transactionId: { type: String },
      status: {
        type: String,
        enum: ["pending", "complete", "failed", "refunded"],
      },
    },
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "preparing",
        "ready",
        "out_for_delivery",
        "delivered",
        "canceled",
        "complete"
      ],
      default: "pending",
    },
    statusHistory: [
      {
        // Added for tracking order status changes
        status: { type: String },
        timestamp: { type: Date, default: Date.now },
        updatedBy: { type: String },
      },
    ],
    totalItemCount: { type: Number, min: 0, default: 0 },
    contactName: { type: String },
    contactPhone: { type: String },
    contactEmail: { type: String }, // Added for notifications
    orderItems: [
      {
        // Changed to array of items with more details
        item: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Item",
        },
        quantity: { type: Number, min: 1, required: true },
        price: { type: Number, min: 0, required: true },
        discountPrice: { type: Number },
        specialInstructions: { type: String },
        modifiers: [
          {
            name: { type: String },
            price: { type: Number },
          },
        ],
      },
    ],
    preparationTimeEstimate: { type: Number }, // Added for kitchen estimates
    preparationStartTime: { type: Date },
    preparationEndTime: { type: Date },
    tableNumber: { type: String }, // Added for dine-in orders
    serverName: { type: String }, // Added for dine-in orders
    metaData: [
      {
        key: { type: String },
        value: mongoose.Schema.Types.Mixed,
      },
    ],
    refunds: [
      {
        // Added for partial/full refunds
        amount: { type: Number, min: 0, required: true },
        reason: { type: String },
        processedAt: { type: Date, default: Date.now },
        processedBy: { type: String },
      },
    ],
    rating: {
      // Added for customer feedback
      value: { type: Number, min: 1, max: 5 },
      comment: { type: String },
      ratedAt: { type: Date },
    },
  },
  { timestamps: true }
);

orderSchema.pre("save", async function (next) {
  // Auto-generate QNIC order ID if not already set
  if (!this.orderId) {
    this.orderId = generateQnicOrderId();
  }
});

const getOrderModel = (connection) => {
  return connection.model("Order", orderSchema);
};

module.exports = getOrderModel;
