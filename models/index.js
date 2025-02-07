const { getUserModel } = require("./user/index");

const {
  getCustomizationOptionModel,
  getItemModel,
  getMenuModel,
} = require("./menu/index");

const {
  getDiscountModel,
  getRestaurantModel,
  getTaxModel,
} = require("./restaurant/index");

module.exports = {
  getUserModel,
  getRestaurantModel,
  getCustomizationOptionModel,
  getItemModel,
  getMenuModel,
  getDiscountModel,
  getTaxModel,
};
