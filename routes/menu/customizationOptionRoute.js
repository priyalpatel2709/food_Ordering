const express = require("express");
const router = express.Router();

const {
  protect,
  identifyTenant,
  authorize,
} = require("../../middleware/index");

const { PERMISSIONS } = require("../../utils/permissions");

const {
  createCustomizationOption,
  getCustomizationOptionById,
  getAllCustomizationOptions,
  deleteById,
  updateById,
} = require("../../controllers/menu/customizationOptionController");

router.post(
  "/",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.CUSTOMIZATION_CREATE),
  createCustomizationOption
);
router.get("/", identifyTenant, protect, authorize(PERMISSIONS.CUSTOMIZATION_READ), getAllCustomizationOptions);
router.get("/:id", identifyTenant, protect, authorize(PERMISSIONS.CUSTOMIZATION_READ), getCustomizationOptionById);
router.delete(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.CUSTOMIZATION_DELETE),
  deleteById
);
router.patch(
  "/:id",
  identifyTenant,
  protect,
  authorize(PERMISSIONS.CUSTOMIZATION_UPDATE),
  updateById
);

module.exports = router;
