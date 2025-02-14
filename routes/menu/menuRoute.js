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
  currentMenu,
} = require("../../controllers/menu/menuController");

router.post("/createMenu", identifyTenant, protect, createMenu);
router.get("/current", identifyTenant, currentMenu);
router.get("/:id", identifyTenant, protect, queryHandler, getMenuById);
router.delete("/:id", identifyTenant, protect, deleteById);
router.put("/:id", identifyTenant, protect, updateById);
router.get("/", identifyTenant, protect, queryHandler, getAllMenus);

module.exports = router;
