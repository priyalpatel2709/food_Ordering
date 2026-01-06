const { userRouters } = require("./user/index");

const {
  restaurantRouters,
  discountRouters,
  taxRouters,
  dashboardRouters,
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
  kdsRoutes,
} = require("./order/index");

const { rbacRoutes } = require("./rbac/index");

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
  kdsRoutes,
  dashboardRouters,
  rbacRoutes,
};
