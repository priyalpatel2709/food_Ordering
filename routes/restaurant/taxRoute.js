const express = require("express");
const router = express.Router();
const identifyTenant = require("../../middleware/IdentificationMiddleware");
const { protect } = require("../../middleware/authMiddleware");

const {
  createTax,
  getTaxById,
  getAllTaxes,
  deleteById,
  updateById,
} = require("../../controllers/restaurant/taxController");

router.post("/", identifyTenant, protect, createTax);
router.get("/", identifyTenant, protect, getAllTaxes);
router.get("/:id", identifyTenant, protect, getTaxById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.patch("/:id", identifyTenant, protect, updateById);

module.exports = router;
