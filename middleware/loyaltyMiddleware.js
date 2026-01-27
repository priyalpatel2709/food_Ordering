const { getCustomerLoyaltyModel } = require("../models/index");
const { logger } = require("./loggingMiddleware");

/**
 * Loyalty Integration Middleware
 * Automatically handles loyalty points and customer tracking during order flow
 */

/**
 * Find or create customer loyalty profile
 * Attaches customer to req.loyaltyCustomer
 */
const identifyLoyaltyCustomer = async (req, res, next) => {
  try {
    const { phone, email, name } = req.body;

    // Skip if no customer contact info provided
    if (!phone && !email) {
      return next();
    }

    const CustomerLoyalty = getCustomerLoyaltyModel(req.restaurantDb);

    // Try to find existing customer by phone (primary) or email
    let customer = null;

    if (phone) {
      customer = await CustomerLoyalty.findOne({
        restaurantId: req.restaurantId,
        phone,
      });
    }

    if (!customer && email) {
      customer = await CustomerLoyalty.findOne({
        restaurantId: req.restaurantId,
        email,
      });
    }

    // If customer doesn't exist, create a new profile
    if (!customer && (phone || email)) {
      customer = new CustomerLoyalty({
        userId: req.user?._id,
        restaurantId: req.restaurantId,
        phone: phone || "",
        email: email || "",
        name: name || email || phone || "Guest",
      });

      // Generate referral code
      await customer.generateReferralCode();

      logger.info(
        `New loyalty customer created: ${customer.phone || customer.email}`,
      );
    }

    // Attach to request for use in controllers
    req.loyaltyCustomer = customer;
    next();
  } catch (error) {
    logger.error("Error in identifyLoyaltyCustomer middleware:", error);
    // Don't block the order if loyalty fails
    next();
  }
};

/**
 * Award loyalty points after successful order
 * Call this after order is completed/paid
 */
const awardLoyaltyPoints = async (order, restaurantDb) => {
  try {
    const CustomerLoyalty = getCustomerLoyaltyModel(restaurantDb);

    // Find customer by phone or email from order
    // const phone = order.contactPhone || order.phone;
    // const email = order.contactEmail || order.email;

    // if (!phone && !email) {
    //   return null;
    // }

    let customer = await CustomerLoyalty.findById(order.customerId);

    if (!customer) {
      // Create new customer if doesn't exist
      customer = new CustomerLoyalty({
        userId: order.customerId,
        // restaurantId,
        phone: phone || "",
        email: email || "",
        name: order.contactName || order.serverName || "Guest",
      });
      await customer.generateReferralCode();
    }

    // Calculate points (1 point per dollar spent)
    const points = Math.floor(order.orderFinalCharge || 0);

    if (points > 0) {
      await customer.addPoints(points, `Order #${order.orderId}`);
      logger.info(
        `Awarded ${points} points to customer ${customer.phone || customer.email}`,
      );
    }

    // Record visit
    await customer.recordVisit(order.orderFinalCharge || 0);

    // Track favorite items
    if (order.orderItems && order.orderItems.length > 0) {
      for (const orderItem of order.orderItems) {
        const itemId = orderItem.item?._id || orderItem.item;
        if (!itemId) continue;

        const favoriteIndex = customer.preferences.favoriteItems.findIndex(
          (fav) => fav.itemId.toString() === itemId.toString(),
        );

        if (favoriteIndex !== -1) {
          customer.preferences.favoriteItems[favoriteIndex].orderCount +=
            orderItem.quantity || 1;
        } else {
          customer.preferences.favoriteItems.push({
            itemId,
            orderCount: orderItem.quantity || 1,
          });
        }
      }

      // Keep only top 10 favorite items
      customer.preferences.favoriteItems.sort(
        (a, b) => b.orderCount - a.orderCount,
      );
      customer.preferences.favoriteItems =
        customer.preferences.favoriteItems.slice(0, 10);

      await customer.save();
    }

    return customer;
  } catch (error) {
    logger.error("Error awarding loyalty points:", error);
    return null;
  }
};

/**
 * Apply loyalty points discount
 * Validates and applies points redemption to order
 */
const applyLoyaltyDiscount = async (
  customerId,
  pointsToRedeem,
  restaurantDb,
  restaurantId,
) => {
  try {
    const CustomerLoyalty = getCustomerLoyaltyModel(restaurantDb);
    const customer = await CustomerLoyalty.findById(customerId);

    if (!customer) {
      throw new Error("Customer not found");
    }

    if (customer.loyaltyPoints.current < pointsToRedeem) {
      throw new Error(
        `Insufficient points. Available: ${customer.loyaltyPoints.current}`,
      );
    }

    // Redeem points (100 points = $1)
    await customer.redeemPoints(pointsToRedeem);

    const discountAmount = pointsToRedeem / 100;

    return {
      success: true,
      discountAmount,
      pointsRedeemed: pointsToRedeem,
      remainingPoints: customer.loyaltyPoints.current,
      message: `Redeemed ${pointsToRedeem} points for $${discountAmount.toFixed(2)} discount`,
    };
  } catch (error) {
    logger.error("Error applying loyalty discount:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get customer loyalty info for display during ordering
 */
const getCustomerLoyaltyInfo = async (
  identifier,
  restaurantDb,
  restaurantId,
) => {
  try {
    const CustomerLoyalty = getCustomerLoyaltyModel(restaurantDb);

    let customer;

    // Try to find by ID, phone, or email
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      customer = await CustomerLoyalty.findById(identifier);
    } else {
      customer = await CustomerLoyalty.findOne({
        restaurantId,
        $or: [{ phone: identifier }, { email: identifier }],
      });
    }

    if (!customer) {
      return null;
    }

    return {
      id: customer._id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      tier: customer.loyaltyTier,
      points: {
        current: customer.loyaltyPoints.current,
        lifetime: customer.loyaltyPoints.lifetime,
        availableDiscount: (customer.loyaltyPoints.current / 100).toFixed(2),
      },
      visitStats: {
        totalVisits: customer.visitStats.totalVisits,
        totalSpent: customer.visitStats.totalSpent,
        averageOrderValue: customer.visitStats.averageOrderValue,
        lastVisit: customer.visitStats.lastVisit,
      },
      favoriteItems: customer.preferences.favoriteItems,
      dietaryRestrictions: customer.preferences.dietaryRestrictions,
      allergies: customer.preferences.allergies,
      notes: customer.notes.map((n) => n.note),
    };
  } catch (error) {
    logger.error("Error getting customer loyalty info:", error);
    return null;
  }
};

module.exports = {
  identifyLoyaltyCustomer,
  awardLoyaltyPoints,
  applyLoyaltyDiscount,
  getCustomerLoyaltyInfo,
};
