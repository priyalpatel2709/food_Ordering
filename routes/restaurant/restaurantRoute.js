const express = require("express");
const router = express.Router();

const {
  protect,
  identifyTenant,
  authorize,
} = require("../../middleware/index");

const { PERMISSIONS } = require("../../utils/permissions");

const {
  createRestaurant,
  getRestaurantById,
  getAllRestaurants,
  deleteById,
  updateById,
} = require("../../controllers/restaurant/restaurantController");

router.post(
  "/",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.RESTAURANT_CREATE),
  createRestaurant
);
router.get(
  "/",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.RESTAURANT_READ),
  getAllRestaurants
);
router.get("/:id", identifyTenant, protect, authorize(PERMISSIONS.RESTAURANT_READ), getRestaurantById);
router.delete(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.RESTAURANT_DELETE),
  deleteById
);
router.patch(
  "/:id",
  identifyTenant,
  authorize(PERMISSIONS.RESTAURANT_UPDATE),
  protect,
  updateById
);

module.exports = router;
