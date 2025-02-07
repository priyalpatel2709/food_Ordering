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

router.post("/createCategory", identifyTenant, protect, createCategory);
router.get("/", identifyTenant, protect, getAllCategories);
router.get("/:id", identifyTenant, protect, getCategoryById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.put("/:id", identifyTenant, protect, updateById);

module.exports = router;
