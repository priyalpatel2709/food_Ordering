const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/authMiddleware");
const identifyTenant = require("../../middleware/IdentificationMiddleware");
const {
  createOrderType,
  getAllOrderTypes,
  getOrderTypeById,
  deleteById,
  updateById,
} = require("../../controllers/order/orderTypeController");


router.post("/", identifyTenant, protect,createOrderType);
router.get("/", identifyTenant, protect,getAllOrderTypes);
router.get("/:id", identifyTenant, protect,getOrderTypeById);
router.delete("/:id", identifyTenant, protect,deleteById);
router.put("/:id", identifyTenant, protect,updateById);

module.exports = router;
