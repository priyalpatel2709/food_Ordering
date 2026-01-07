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
  createItem,
  getItemById,
  getAllItems,
  deleteById,
  updateById,
} = require("../../controllers/menu/itemController");

router.post("/createItem", identifyTenant, protect, authorize(PERMISSIONS.ITEM_CREATE), createItem);
router.get("/", identifyTenant, queryHandler, protect, authorize(PERMISSIONS.ITEM_READ), getAllItems);
router.get("/:id", identifyTenant, queryHandler, protect, authorize(PERMISSIONS.ITEM_READ), getItemById);
router.delete("/:id", identifyTenant, protect, authorize(PERMISSIONS.ITEM_DELETE), deleteById);
router.patch("/:id", identifyTenant, protect, authorize(PERMISSIONS.ITEM_UPDATE), updateById);

module.exports = router;
