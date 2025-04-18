const express = require("express");
const router = express.Router();
const identifyTenant = require("../../middleware/IdentificationMiddleware");
const { protect } = require("../../middleware/authMiddleware");

const {
  authUser,
  registerUser,
  deleteById,
  getAllUsers,
  getUsersByRestaurantsId,
  getAllOrders
} = require("../../controllers/user/userController");

router.post("/", identifyTenant, registerUser);
router.post("/login", identifyTenant, authUser);
router.delete("/:id", identifyTenant, protect, deleteById);
router.get("/allUsers", identifyTenant, protect, getAllUsers);
router.get(
  "/restaurant/:restaurantsId",
  identifyTenant,
  protect,
  getUsersByRestaurantsId
);

router.get("/orders", identifyTenant, protect, getAllOrders);

module.exports = router;
