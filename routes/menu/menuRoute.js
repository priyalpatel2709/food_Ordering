const express = require("express");
const router = express.Router();
const {
  identifyTenant,
  protect,
  queryHandler,
} = require("../../middleware/index");

const {
  createMenu,
  getMenuById,
  getAllMenus,
  deleteById,
  updateById,
} = require("../../controllers/menu/menuController");

router.post("/createMenu", identifyTenant, protect, createMenu);
router.get("/", identifyTenant, protect, queryHandler, getAllMenus);
router.get("/:id", identifyTenant, protect, getMenuById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.put("/:id", identifyTenant, protect, updateById);

module.exports = router;
