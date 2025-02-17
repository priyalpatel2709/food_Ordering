const { getUserModel } = require("./user/index");

const {
  getCustomizationOptionModel,
  getItemModel,
  getMenuModel,
  getCategoryModel,
} = require("./menu/index");

const {
  getDiscountModel,
  getRestaurantModel,
  getTaxModel,
} = require("./restaurant/index");

const { getOrderModel, getOrderTypeModel } = require("./order/index");

module.exports = {
  getUserModel,
  getRestaurantModel,
  getCustomizationOptionModel,
  getItemModel,
  getMenuModel,
  getDiscountModel,
  getTaxModel,
  getCategoryModel,
  getOrderModel,
  getOrderTypeModel,
};
