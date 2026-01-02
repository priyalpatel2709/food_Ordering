const express = require("express");
const router = express.Router();
const identifyTenant = require("../../middleware/IdentificationMiddleware");
const { protect } = require("../../middleware/authMiddleware");

const {
  createRestaurant,
  getRestaurantById,
  getAllRestaurants,
  deleteById,
  updateById,
} = require("../../controllers/restaurant/restaurantController");

router.post("/", identifyTenant, protect, createRestaurant);
router.get("/", identifyTenant, protect, getAllRestaurants);
router.get("/:id", identifyTenant, protect, getRestaurantById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.patch("/:id", identifyTenant, protect, updateById);

module.exports = router;
