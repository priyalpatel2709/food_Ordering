const express = require("express");
const router = express.Router();
const identifyTenant = require("../../middleware/IdentificationMiddleware");
const { protect } = require("../../middleware/authMiddleware");

const {
  createCategory,
  getCategoryById,
  getAllCategories,
  deleteById,
  updateById,
} = require("../../controllers/menu/categoryController");

router.post("/", identifyTenant, protect, createCategory);
router.get("/", identifyTenant, protect, getAllCategories);
router.get("/:id", identifyTenant, protect, getCategoryById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.patch("/:id", identifyTenant, protect, updateById);

module.exports = router;
