const express = require("express");
const router = express.Router();
const {
  protect,
  identifyTenant,
  authorize,
} = require("../../middleware/index");
const { PERMISSIONS } = require("../../utils/permissions");
const {
  createTable,
  getAllTables,
  getTableById,
  updateTable,
  deleteTable,
  bulkCreateTables,
  getTableQRCode,
  resetAllTables,
} = require("../../controllers/restaurant/tableController");

router.use(identifyTenant);
router.use(protect);

router.post("/", authorize(PERMISSIONS.RESTAURANT_UPDATE), createTable);

router.post(
  "/bulk",
  authorize(PERMISSIONS.RESTAURANT_UPDATE),
  bulkCreateTables,
);

router.post("/reset", authorize(PERMISSIONS.RESTAURANT_UPDATE), resetAllTables);

router.get("/", authorize(PERMISSIONS.RESTAURANT_READ), getAllTables);

router.get("/:id", authorize(PERMISSIONS.RESTAURANT_READ), getTableById);

router.get(
  "/:id/qrcode",
  authorize(PERMISSIONS.RESTAURANT_READ),
  getTableQRCode,
);

router.put("/:id", authorize(PERMISSIONS.RESTAURANT_UPDATE), updateTable);

router.delete("/:id", authorize(PERMISSIONS.RESTAURANT_UPDATE), deleteTable);

module.exports = router;
