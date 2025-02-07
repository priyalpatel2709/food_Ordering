const {
  restaurantRouters,
  discountRouters,
  taxRouters,
} = require("./restaurant/index");
const { userRouters } = require("./user/index");

module.exports = {
  userRouters,
  restaurantRouters,
  discountRouters,
  taxRouters,
};
