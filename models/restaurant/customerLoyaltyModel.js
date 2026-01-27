const mongoose = require("mongoose");

/**
 * Customer Loyalty & Marketing Model
 * Tracks customer details, loyalty points, visit history, and marketing preferences
 */
const customerLoyaltySchema = new mongoose.Schema(
    {
        // Basic Customer Information
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            // required: true,
        },
        restaurantId: {
            type: String,
            // required: true,
            index: true,
        },

        // Contact Details
        phone: {
            type: String,
            required: true,
            index: true,
        },
        email: {
            type: String,
            index: true,
        },
        name: {
            type: String,
            required: true,
        },
        dateOfBirth: {
            type: Date,
        },
        anniversary: {
            type: Date,
        },

        // Loyalty Program
        loyaltyTier: {
            type: String,
            enum: ["bronze", "silver", "gold", "platinum", "vip"],
            default: "bronze",
        },
        loyaltyPoints: {
            current: { type: Number, default: 0 },
            lifetime: { type: Number, default: 0 },
            redeemed: { type: Number, default: 0 },
        },
        memberSince: {
            type: Date,
            default: Date.now,
        },

        // Visit & Spending History
        visitStats: {
            totalVisits: { type: Number, default: 0 },
            lastVisit: { type: Date },
            firstVisit: { type: Date },
            averageOrderValue: { type: Number, default: 0 },
            totalSpent: { type: Number, default: 0 },
            averageVisitsPerMonth: { type: Number, default: 0 },
        },

        // Preferences
        preferences: {
            favoriteItems: [
                {
                    itemId: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: "Item",
                    },
                    orderCount: { type: Number, default: 0 },
                },
            ],
            dietaryRestrictions: [
                {
                    type: String,
                    enum: [
                        "vegetarian",
                        "vegan",
                        "gluten-free",
                        "dairy-free",
                        "nut-free",
                        "halal",
                        "kosher",
                        "other",
                    ],
                },
            ],
            allergies: [String],
            spiceLevel: {
                type: String,
                enum: ["mild", "medium", "hot", "extra-hot"],
            },
            preferredSeating: {
                type: String,
                enum: ["indoor", "outdoor", "bar", "window", "booth"],
            },
        },

        // Marketing Preferences
        marketing: {
            emailOptIn: { type: Boolean, default: true },
            smsOptIn: { type: Boolean, default: true },
            pushNotifications: { type: Boolean, default: true },
            specialOffers: { type: Boolean, default: true },
            birthdayOffers: { type: Boolean, default: true },
            anniversaryOffers: { type: Boolean, default: true },
        },

        // Tags for Segmentation
        tags: [
            {
                type: String,
                // Examples: "high-value", "frequent-visitor", "weekend-diner", "lunch-regular"
            },
        ],

        // Customer Segments
        segments: [
            {
                type: String,
                // Examples: "vip", "at-risk", "new-customer", "loyal", "dormant"
            },
        ],

        // Referral Program
        referral: {
            referralCode: {
                type: String,
                unique: true,
                sparse: true,
            },
            referredBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "CustomerLoyalty",
            },
            referralsCount: { type: Number, default: 0 },
            referralRewards: { type: Number, default: 0 },
        },

        // Special Occasions (for automated marketing)
        specialOccasions: [
            {
                name: { type: String }, // e.g., "Wedding Anniversary", "Child's Birthday"
                date: { type: Date },
                recurring: { type: Boolean, default: true },
            },
        ],

        // Feedback & Reviews
        feedback: {
            averageRating: { type: Number, default: 0 },
            totalReviews: { type: Number, default: 0 },
            lastReviewDate: { type: Date },
        },

        // Status
        status: {
            type: String,
            enum: ["active", "inactive", "blocked", "dormant"],
            default: "active",
        },

        // Notes (for staff)
        notes: [
            {
                note: { type: String },
                addedBy: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                },
                addedAt: { type: Date, default: Date.now },
            },
        ],

        // Last Activity
        lastActivity: {
            type: Date,
            default: Date.now,
        },
    },
    {
        timestamps: true,
    }
);

// Indexes for performance
customerLoyaltySchema.index({ restaurantId: 1, phone: 1 }, { unique: true });
customerLoyaltySchema.index({ restaurantId: 1, email: 1 });
customerLoyaltySchema.index({ restaurantId: 1, loyaltyTier: 1 });
customerLoyaltySchema.index({ restaurantId: 1, status: 1 });
customerLoyaltySchema.index({ "referral.referralCode": 1 });
customerLoyaltySchema.index({ tags: 1 });
customerLoyaltySchema.index({ segments: 1 });

// Methods

/**
 * Add loyalty points
 */
customerLoyaltySchema.methods.addPoints = function (points, reason = "purchase") {
    this.loyaltyPoints.current += points;
    this.loyaltyPoints.lifetime += points;
    this.lastActivity = new Date();

    // Auto-upgrade tier based on lifetime points
    this.updateTier();

    return this.save();
};

/**
 * Redeem loyalty points
 */
customerLoyaltySchema.methods.redeemPoints = function (points) {
    if (this.loyaltyPoints.current < points) {
        throw new Error("Insufficient loyalty points");
    }

    this.loyaltyPoints.current -= points;
    this.loyaltyPoints.redeemed += points;
    this.lastActivity = new Date();

    return this.save();
};

/**
 * Update loyalty tier based on lifetime points
 */
customerLoyaltySchema.methods.updateTier = function () {
    const points = this.loyaltyPoints.lifetime;

    if (points >= 10000) {
        this.loyaltyTier = "vip";
    } else if (points >= 5000) {
        this.loyaltyTier = "platinum";
    } else if (points >= 2500) {
        this.loyaltyTier = "gold";
    } else if (points >= 1000) {
        this.loyaltyTier = "silver";
    } else {
        this.loyaltyTier = "bronze";
    }
};

/**
 * Record a visit
 */
customerLoyaltySchema.methods.recordVisit = function (orderAmount) {
    this.visitStats.totalVisits += 1;
    this.visitStats.lastVisit = new Date();

    if (!this.visitStats.firstVisit) {
        this.visitStats.firstVisit = new Date();
    }

    this.visitStats.totalSpent += orderAmount;
    this.visitStats.averageOrderValue =
        this.visitStats.totalSpent / this.visitStats.totalVisits;

    this.lastActivity = new Date();

    // Auto-tag based on visit frequency
    this.autoTag();

    return this.save();
};

/**
 * Auto-tag customers based on behavior
 */
customerLoyaltySchema.methods.autoTag = function () {
    const tags = new Set(this.tags);

    // High-value customer
    if (this.visitStats.averageOrderValue > 50) {
        tags.add("high-value");
    }

    // Frequent visitor
    if (this.visitStats.totalVisits > 20) {
        tags.add("frequent-visitor");
    }

    // New customer
    const daysSinceFirst =
        (Date.now() - this.visitStats.firstVisit) / (1000 * 60 * 60 * 24);
    if (daysSinceFirst < 30) {
        tags.add("new-customer");
    }

    // Dormant customer
    if (this.visitStats.lastVisit) {
        const daysSinceLast =
            (Date.now() - this.visitStats.lastVisit) / (1000 * 60 * 60 * 24);
        if (daysSinceLast > 90) {
            tags.add("dormant");
            this.status = "dormant";
        }
    }

    this.tags = Array.from(tags);
};

/**
 * Generate unique referral code
 */
customerLoyaltySchema.methods.generateReferralCode = function () {
    const code = `${this.name.substring(0, 3).toUpperCase()}${Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase()}`;
    this.referral.referralCode = code;
    return this.save();
};

const getCustomerLoyaltyModel = (connection) => {
    return connection.model("CustomerLoyalty", customerLoyaltySchema);
};

module.exports = getCustomerLoyaltyModel;
