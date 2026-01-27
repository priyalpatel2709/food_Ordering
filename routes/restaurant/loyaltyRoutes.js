const express = require("express");
const router = express.Router();

const {
    protect,
    authorize,
    identifyTenant,
} = require("../../middleware/index");
const { PERMISSIONS } = require("../../utils/permissions");

const {
    createOrUpdateCustomer,
    getCustomer,
    getAllCustomers,
    addPoints,
    redeemPoints,
    recordVisit,
    getLoyaltyStats,
    getUpcomingOccasions,
    addNote,
} = require("../../controllers/restaurant/customerLoyaltyController");

// All routes require authentication and tenant identification
router.use(identifyTenant);
router.use(protect);

// Customer Management
router.post(
    "/customers",
    authorize(PERMISSIONS.RESTAURANT_UPDATE),
    createOrUpdateCustomer
);

router.get(
    "/customers",
    authorize(PERMISSIONS.RESTAURANT_READ),
    getAllCustomers
);

router.get(
    "/customers/upcoming-occasions",
    authorize(PERMISSIONS.RESTAURANT_READ),
    getUpcomingOccasions
);

router.get(
    "/customers/:identifier",
    authorize(PERMISSIONS.RESTAURANT_READ),
    getCustomer
);

// Points Management
router.post(
    "/customers/:id/points",
    authorize(PERMISSIONS.RESTAURANT_UPDATE),
    addPoints
);

router.post(
    "/customers/:id/redeem",
    authorize(PERMISSIONS.RESTAURANT_UPDATE),
    redeemPoints
);

// Visit Tracking
router.post(
    "/customers/:id/visit",
    authorize(PERMISSIONS.RESTAURANT_UPDATE),
    recordVisit
);

// Notes
router.post(
    "/customers/:id/notes",
    authorize(PERMISSIONS.RESTAURANT_UPDATE),
    addNote
);

// Statistics
router.get(
    "/stats",
    authorize(PERMISSIONS.RESTAURANT_READ),
    getLoyaltyStats
);

module.exports = router;
