const express = require("express");
const router = express.Router();

const {
  protect,
  identifyTenant,
  authorize,
} = require("../../middleware/index");

const { PERMISSIONS } = require("../../utils/permissions");

const {
  createTax,
  getTaxById,
  getAllTaxes,
  deleteById,
  updateById,
} = require("../../controllers/restaurant/taxController");

router.post(
  "/",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.TAX_CREATE),
  createTax
);
router.get("/", identifyTenant, protect, authorize(PERMISSIONS.TAX_READ), getAllTaxes);
router.get("/:id", identifyTenant, protect, authorize(PERMISSIONS.TAX_READ), getTaxById);
router.delete(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.TAX_DELETE),
  deleteById
);
router.patch(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.TAX_UPDATE),
  updateById
);

module.exports = router;
