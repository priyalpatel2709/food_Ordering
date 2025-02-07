// const userRouters = require("./user/userRoute");
const { restaurantRouters } = require("./restaurant/index");
const { userRouters } = require("./user/index");

module.exports = {
  userRouters,
  restaurantRouters,
};
