const express = require("express");
const router = express.Router();
const { identifyTenant, allowedRoles } = require("../../middleware/index");
const { protect } = require("../../middleware/authMiddleware");

const {
  authUser,
  registerUser,
  deleteById,
  getAllUsers,
  getUsersByRestaurantId,
  getAllOrders,
} = require("../../controllers/user/userController");

router.post("/", identifyTenant, registerUser);
router.post("/login", identifyTenant, authUser);
router.delete("/:id", identifyTenant, protect, deleteById);
router.get("/allUsers", identifyTenant, protect, getAllUsers);
router.get("/staff", identifyTenant, protect, getUsersByRestaurantId);

router.get("/orders", identifyTenant, protect, getAllOrders);

module.exports = router;
