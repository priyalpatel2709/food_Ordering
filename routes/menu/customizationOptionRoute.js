const express = require("express");
const router = express.Router();
const identifyTenant = require("../../middleware/IdentificationMiddleware");
const { protect } = require("../../middleware/authMiddleware");

const {
  createCustomizationOption,
  getCustomizationOptionById,
  getAllCustomizationOptions,
  deleteById,
  updateById,
} = require("../../controllers/menu/customizationOptionController");

router.post("/", identifyTenant, protect, createCustomizationOption);
router.get("/", identifyTenant, protect, getAllCustomizationOptions);
router.get("/:id", identifyTenant, protect, getCustomizationOptionById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.patch("/:id", identifyTenant, protect, updateById);

module.exports = router;
