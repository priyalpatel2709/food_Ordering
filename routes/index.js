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
} = require("./menu/index");

const { orderRoutes, orderTypeRoutes, refundRoutes } = require("./order/index");

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
  refundRoutes,
};
