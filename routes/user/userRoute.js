const express = require("express");
const router = express.Router();
const { identifyTenant, authorize } = require("../../middleware/index");
const { protect } = require("../../middleware/authMiddleware");
const { PERMISSIONS } = require("../../utils/permissions");

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
router.delete("/:id", identifyTenant, protect, authorize(PERMISSIONS.USER_DELETE), deleteById);
router.get("/allUsers", identifyTenant, protect, authorize(PERMISSIONS.USER_READ), getAllUsers);
router.get("/staff", identifyTenant, protect, authorize(PERMISSIONS.USER_READ), getUsersByRestaurantId);

router.get("/orders", identifyTenant, protect, authorize(PERMISSIONS.ORDER_READ), getAllOrders);

module.exports = router;
