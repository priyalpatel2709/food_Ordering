const express = require("express");
const router = express.Router();
const {
  identifyTenant,
  protect,
  queryHandler,
  authorize,
} = require("../../middleware/index");

const { PERMISSIONS } = require("../../utils/permissions");

const {
  createMenu,
  getMenuById,
  getAllMenus,
  deleteById,
  updateById,
  currentMenu,
  updateMenu,
  addItemToMenu,
} = require("../../controllers/menu/menuController");

router.post("/createMenu", identifyTenant, protect, authorize(PERMISSIONS.MENU_CREATE), createMenu);
router.post("/:id/add-item", identifyTenant, protect, authorize(PERMISSIONS.MENU_UPDATE), addItemToMenu);
router.get("/current", identifyTenant, currentMenu);
router.get("/:id", identifyTenant, protect, queryHandler, authorize(PERMISSIONS.MENU_READ), getMenuById);
router.delete("/:id", identifyTenant, protect, authorize(PERMISSIONS.MENU_DELETE), deleteById);
router.put(
  "/updateById/:id",
  identifyTenant,
  protect,
  queryHandler,
  authorize(PERMISSIONS.MENU_UPDATE),
  updateMenu
);
router.put("/:id", identifyTenant, protect, authorize(PERMISSIONS.MENU_UPDATE), updateById);
router.get("/", identifyTenant, protect, queryHandler, authorize(PERMISSIONS.MENU_READ), getAllMenus);

module.exports = router;
