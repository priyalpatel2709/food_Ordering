const express = require("express");
const router = express.Router();

const {
  protect,
  identifyTenant,
  authorize,
} = require("../../middleware/index");

const { PERMISSIONS } = require("../../utils/permissions");

const {
  createDiscount,
  getDiscountById,
  getAllDiscounts,
  deleteById,
  updateById,
} = require("../../controllers/restaurant/discountController");

router.post(
  "/",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.DISCOUNT_CREATE),
  createDiscount
);
router.get("/", identifyTenant, protect, getAllDiscounts);
router.get("/:id", identifyTenant, protect, getDiscountById);
router.delete(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.DISCOUNT_DELETE),
  deleteById
);
router.patch(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.DISCOUNT_UPDATE),
  updateById
);

module.exports = router;
