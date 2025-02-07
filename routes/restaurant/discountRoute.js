const express = require("express");
const router = express.Router();
const identifyTenant = require("../../middleware/IdentificationMiddleware");
const { protect } = require("../../middleware/authMiddleware");

const {
  createDiscount,
  getDiscountById,
  getAllDiscounts,
  deleteById,
  updateById,
} = require("../../controllers/restaurant/discountController");

router.post("/createDiscount", identifyTenant, protect, createDiscount);
router.get("/", identifyTenant, protect, getAllDiscounts);
router.get("/:id", identifyTenant, protect, getDiscountById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.put("/:id", identifyTenant, protect, updateById);

module.exports = router;
