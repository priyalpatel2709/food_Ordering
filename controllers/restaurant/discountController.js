const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const { getDiscountModel } = require("../../models/index");
const { CACHE_PREFIXES } = require("../../utils/cache");

const createDiscount = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
    cacheKeyPrefix: CACHE_PREFIXES.DISCOUNTS,
  });
  discountOperations.create(req, res, next);
});

const getAllDiscounts = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
    cacheKeyPrefix: CACHE_PREFIXES.DISCOUNTS,
    searchFields: ["discountCode", "discountName"],
  });
  discountOperations.getAll(req, res, next);
});

const getDiscountById = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
    cacheKeyPrefix: CACHE_PREFIXES.DISCOUNTS,
  });
  discountOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
    cacheKeyPrefix: CACHE_PREFIXES.DISCOUNTS,
  });
  discountOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
    cacheKeyPrefix: CACHE_PREFIXES.DISCOUNTS,
  });
  discountOperations.updateById(req, res, next);
});

module.exports = {
  createDiscount,
  getDiscountById,
  getAllDiscounts,
  deleteById,
  updateById,
};
