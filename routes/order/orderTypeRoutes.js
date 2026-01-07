const express = require("express");
const router = express.Router();

const {
  protect,
  identifyTenant,
  authorize
} = require("../../middleware/index");
const { PERMISSIONS } = require("../../utils/permissions");

const {
  createOrderType,
  getAllOrderTypes,
  getOrderTypeById,
  deleteById,
  updateById,
} = require("../../controllers/order/orderTypeController");


router.post("/", identifyTenant, protect, authorize(PERMISSIONS.RESTAURANT_UPDATE), createOrderType);
router.get("/", identifyTenant, protect, authorize(PERMISSIONS.RESTAURANT_READ), getAllOrderTypes);
router.get("/:id", identifyTenant, protect, authorize(PERMISSIONS.RESTAURANT_READ), getOrderTypeById);
router.delete("/:id", identifyTenant, protect, authorize(PERMISSIONS.RESTAURANT_UPDATE), deleteById);
router.put("/:id", identifyTenant, protect, authorize(PERMISSIONS.RESTAURANT_UPDATE), updateById);

module.exports = router;
