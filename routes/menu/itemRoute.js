const express = require("express");
const router = express.Router();
const identifyTenant = require("../../middleware/IdentificationMiddleware");
const { protect } = require("../../middleware/authMiddleware");

const {
  createItem,
  getItemById,
  getAllItems,
  deleteById,
  updateById,
} = require("../../controllers/menu/itemController");

router.post("/createItem", identifyTenant, protect, createItem);
router.get("/", identifyTenant, protect, getAllItems);
router.get("/:id", identifyTenant, protect, getItemById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.put("/:id", identifyTenant, protect, updateById);

module.exports = router;
