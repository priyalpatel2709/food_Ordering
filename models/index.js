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

const {
  getOrderModel,
  getOrderTypeModel,
  getRefundModel,
} = require("./order/index");

const {
  getRoleModel,
  getPermissionModel,
} = require("./rbac/index");

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
  getRefundModel,
  getRoleModel,
  getPermissionModel,
};
