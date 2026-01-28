const restaurantRouters = require("./restaurantRoute");
const discountRouters = require("./discountRoute");
const taxRouters = require("./taxRoute");
const dashboardRouters = require("./dashboardRoute");
const tableRouters = require("./tableRoute");
const wasteRouters = require("./wasteRoutes");
const loyaltyRouters = require("./loyaltyRoutes");
const cashRegisterRouters = require("./cashRegisterRoute");

module.exports = {
  restaurantRouters,
  discountRouters,
  taxRouters,
  dashboardRouters,
  tableRouters,
  wasteRouters,
  loyaltyRouters,
  cashRegisterRouters,
};
