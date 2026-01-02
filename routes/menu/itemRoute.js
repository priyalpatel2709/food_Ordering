const express = require("express");
const router = express.Router();

const {
  identifyTenant,
  protect,
  queryHandler,
} = require("../../middleware/index");

const {
  createItem,
  getItemById,
  getAllItems,
  deleteById,
  updateById,
} = require("../../controllers/menu/itemController");

router.post("/createItem", identifyTenant, protect, createItem);
router.get("/", identifyTenant, queryHandler, protect, getAllItems);
router.get("/:id", identifyTenant, queryHandler, protect, getItemById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.patch("/:id", identifyTenant, protect, updateById);

module.exports = router;
