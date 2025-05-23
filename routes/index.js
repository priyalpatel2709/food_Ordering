const { userRouters } = require("./user/index");

const {
  restaurantRouters,
  discountRouters,
  taxRouters,
} = require("./restaurant/index");

const {
  customizationOptionRoute,
  categoryRoute,
  itemRoute,
  menuRoute,
  menuRouteV2,
} = require("./menu/index");

const {
  orderRoutes,
  orderTypeRoutes,
  paymentRoutes,
} = require("./order/index");

module.exports = {
  userRouters,
  restaurantRouters,
  discountRouters,
  taxRouters,
  customizationOptionRoute,
  categoryRoute,
  itemRoute,
  menuRoute,
  orderRoutes,
  orderTypeRoutes,
  paymentRoutes,
  menuRouteV2,
};
