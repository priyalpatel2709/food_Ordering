const express = require("express");
const router = express.Router();
const {
  identifyTenant,
  protect,
  authorize
} = require("../../middleware/index");
const { PERMISSIONS } = require("../../utils/permissions");

const {
  createCategory,
  getCategoryById,
  getAllCategories,
  deleteById,
  updateById,
} = require("../../controllers/menu/categoryController");

router.post("/", identifyTenant, protect, authorize(PERMISSIONS.CATEGORY_CREATE), createCategory);
router.get("/", identifyTenant, protect, authorize(PERMISSIONS.CATEGORY_READ), getAllCategories);
router.get("/:id", identifyTenant, protect, authorize(PERMISSIONS.CATEGORY_READ), getCategoryById);
router.delete("/:id", identifyTenant, protect, authorize(PERMISSIONS.CATEGORY_DELETE), deleteById);
router.patch("/:id", identifyTenant, protect, authorize(PERMISSIONS.CATEGORY_UPDATE), updateById);

module.exports = router;
