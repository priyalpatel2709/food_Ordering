const getDiscountModel = require("./discountModel");
const getRestaurantModel = require("./restaurantModel");
const getTaxModel = require("./taxModel");
const getTableModel = require("./tableModel");
const getWasteLogModel = require("./wasteLogModel");
const getCustomerLoyaltyModel = require("./customerLoyaltyModel");
const { getCashRegisterModel, getCashSessionModel } = require("./cashRegisterModel");

module.exports = {
  getDiscountModel,
  getRestaurantModel,
  getTaxModel,
  getTableModel,
  getWasteLogModel,
  getCustomerLoyaltyModel,
  getCashRegisterModel,
  getCashSessionModel,
};
