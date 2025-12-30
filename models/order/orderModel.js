const mongoose = require("mongoose");
const { generateQnicOrderId } = require("../../utils/utils");
const { 
  ORDER_STATUS, 
  PAYMENT_METHODS, 
  PAYMENT_STATUS, 
  TRANSACTION_STATUS,
  ADDRESS_TYPES 
} = require("../../utils/const");

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
      addressType: { type: String, enum: Object.values(ADDRESS_TYPES) },
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
    payment: {
      history: [
        {
          method: {
            type: String,
            enum: Object.values(PAYMENT_METHODS),
            required: true,
          },
          transactionId: { type: String, trim: true, default: null },
          status: {
            type: String,
            enum: Object.values(TRANSACTION_STATUS),
            default: TRANSACTION_STATUS.PENDING,
          },
          amount: { type: Number, required: true, min: 0 },
          processedAt: { type: Date, default: Date.now },
          processedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional: if done manually
          gateway: { type: String, trim: true }, // e.g., Stripe, Razorpay
          notes: { type: String, trim: true, maxlength: 500 },
        },
      ],
      totalPaid: { type: Number, required: true, default: 0 },
      balanceDue: { type: Number, required: true, default: 0 },
      paymentStatus: {
        type: String,
        enum: Object.values(PAYMENT_STATUS),
        default: PAYMENT_STATUS.PENDING,
      },
    },
    orderStatus: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING,
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
        itemStatus: { type: String, default: 'new' }, // KDS status for individual item
      },
    ],
    kdsStatus: { type: String, default: 'new' }, // Overall KDS status
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
    refunds: {
      history: [{ type: mongoose.Schema.Types.ObjectId, ref: "Refund" }],
      remainingCharge: { type: Number, min: 0, default: 0 },
    },
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
  next();
});

// Indexes for performance
// orderSchema.index({ restaurantId: 1, createdAt: -1 });
// orderSchema.index({ customerId: 1, orderStatus: 1 });
// orderSchema.index({ orderId: 1 }, { unique: true });
// orderSchema.index({ orderStatus: 1 });
// orderSchema.index({ 'payment.paymentStatus': 1 });

const getOrderModel = (connection) => {
  return connection.model("Order", orderSchema);
};

module.exports = getOrderModel;
