const Joi = require("joi");
const { GENDER, ADDRESS_TYPES } = require("../utils/const");

const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(", ");
      return res.status(400).json({
        status: "error",
        message: "Validation error",
        errors: errorMessage,
      });
    }
    next();
  };
};

// Common validation schemas
const schemas = {
  // User validation schemas
  userRegistration: Joi.object({
    name: Joi.string().required().min(2).max(50),
    email: Joi.string().required().email(),
    password: Joi.string()
      .required()
      .min(6)
      .max(30)
      .pattern(
        new RegExp(
          "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{6,30}$"
        )
      )
      .messages({
        'string.pattern.base': 'Password must be 6-30 characters and include at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
        'string.min': 'Password must be at least 6 characters long',
        'string.max': 'Password must not exceed 30 characters',
        'any.required': 'Password is required'
      }),
    phone: Joi.string()
      .pattern(new RegExp("^[0-9]{10}$"))
      .message("Phone number must be 10 digits"),
    address: Joi.string().required().min(5),
    gender: Joi.string().valid(...Object.values(GENDER)).optional(),
  }),

  // Restaurant validation schemas
  restaurantCreation: Joi.object({
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().required().min(10),
    address: Joi.string().required(),
    cuisine: Joi.string().required(),
    openingHours: Joi.object({
      open: Joi.string().required(),
      close: Joi.string().required(),
    }),
    contactInfo: Joi.object({
      phone: Joi.string().required(),
      email: Joi.string().email().required(),
    }),
  }),

  // Menu item validation schemas
  menuItem: Joi.object({
    name: Joi.string().required().min(2).max(100),
    description: Joi.string().required(),
    price: Joi.number().required().min(0),
    category: Joi.string().required(),
    isVegetarian: Joi.boolean(),
    isAvailable: Joi.boolean(),
    customizationOptions: Joi.array().items(
      Joi.object({
        name: Joi.string().required(),
        options: Joi.array().items(
          Joi.object({
            name: Joi.string().required(),
            price: Joi.number().min(0),
          })
        ),
      })
    ),
  }),

  // Order validation schemas
  orderCreation: Joi.object({
    restaurantId: Joi.required(),
    tax: Joi.array().items(Joi.string()).required(),
    menuId: Joi.string().required(),
    discount: Joi.array().items(Joi.string()),

    orderNote: Joi.string().allow("", null),
    orderType: Joi.string().required(),

    totalItemCount: Joi.number().min(1),
    restaurantTipCharge: Joi.number().min(0).default(0),
    deliveryCharge: Joi.number().min(0).default(0),
    deliveryTipCharge: Joi.number().min(0).default(0),
    isScheduledOrder: Joi.boolean(),
    scheduledTime: Joi.date(),
    isDeliveryOrder: Joi.boolean(),

    deliveryAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
      addressType: Joi.string().valid(...Object.values(ADDRESS_TYPES)).optional(),
      coordinates: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      }),
    }).optional(),

    deliveryInstructions: Joi.string().allow("", null),

    contactName: Joi.string().required().min(2),
    contactPhone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .required(),

    orderItems: Joi.array()
      .items(
        Joi.object({
          item: Joi.string().required(),
          quantity: Joi.number().required().min(1),
          price: Joi.number().min(0).required(),
          specialInstructions: Joi.string().allow("", null),
          modifiers: Joi.array()
            .items(
              Joi.object({
                name: Joi.string().required(),
                price: Joi.number().min(0).optional(),
              })
            )
            .optional(),
        })
      )
      .min(1)
      .required(),
  }),

  giveRefund: Joi.object({
    amount: Joi.number().required().min(0),
    reason: Joi.string().required().min(5),
  }),

  processPayment: Joi.object({
    amount: Joi.number().required().min(0),
    method: Joi.string().required(),
    transactionId: Joi.string().required(),
    gateway: Joi.string().allow("", null),
    notes: Joi.string().allow("", null),
  }),

  // Order with payment validation schema (atomic transaction)
  orderWithPayment: Joi.object({
    restaurantId: Joi.required(),
    tax: Joi.array().items(Joi.string()).optional(),
    menuId: Joi.string().optional(),
    discount: Joi.array().items(Joi.string()).optional(),

    orderNote: Joi.string().allow("", null),
    orderType: Joi.string().optional(),

    restaurantTipCharge: Joi.number().min(0).default(0),
    deliveryCharge: Joi.number().min(0).default(0),
    deliveryTipCharge: Joi.number().min(0).default(0),
    isScheduledOrder: Joi.boolean().default(false),
    scheduledTime: Joi.date().when("isScheduledOrder", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),
    isDeliveryOrder: Joi.boolean().default(false),

    deliveryAddress: Joi.object({
      street: Joi.string().required(),
      city: Joi.string().required(),
      state: Joi.string().required(),
      zipCode: Joi.string().required(),
      country: Joi.string().required(),
      addressType: Joi.string().valid(...Object.values(ADDRESS_TYPES)).optional(),
      coordinates: Joi.object({
        lat: Joi.number().required(),
        lng: Joi.number().required(),
      }).optional(),
    }).when("isDeliveryOrder", {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional(),
    }),

    contactName: Joi.string().required().min(2),
    contactPhone: Joi.string()
      .pattern(/^[0-9]{10,15}$/)
      .required(),
    contactEmail: Joi.string().email().optional(),

    tableNumber: Joi.string().optional(),
    serverName: Joi.string().optional(),

    orderItems: Joi.array()
      .items(
        Joi.object({
          item: Joi.string().required(),
          quantity: Joi.number().required().min(1),
          specialInstructions: Joi.string().allow("", null),
          modifiers: Joi.array()
            .items(
              Joi.object({
                name: Joi.string().required(),
                price: Joi.number().min(0).optional(),
              })
            )
            .optional(),
        })
      )
      .min(1)
      .required(),

    // Payment information (required for this endpoint)
    payment: Joi.object({
      method: Joi.string()
        .valid("credit", "debit", "cash", "online", "wallet", "upi")
        .required(),
      transactionId: Joi.string().optional(),
      gateway: Joi.string().optional(),
      notes: Joi.string().max(500).optional(),
    }).required(),
  }),
};

module.exports = {
  validateRequest,
  schemas,
};
