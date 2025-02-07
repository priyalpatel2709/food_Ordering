const {
  restaurantRouters,
  discountRouters,
  taxRouters,
} = require("./restaurant/index");
const { userRouters } = require("./user/index");
const { customizationOptionRoute } = require("./menu/index");

module.exports = {
  userRouters,
  restaurantRouters,
  discountRouters,
  taxRouters,
  customizationOptionRoute,
};
