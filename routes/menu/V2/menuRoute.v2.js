const express = require("express");
const router = express.Router();
const {
  identifyTenant,
  protect,
  queryHandler,
} = require("../../../middleware/index");

const {
  currentMenu,
} = require("../../../controllers/menu/V2/menuController.v2");

router.get("/current", identifyTenant, currentMenu);

module.exports = router;
