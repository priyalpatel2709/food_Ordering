const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const { getDiscountModel } = require("../../models/index");

const createDiscount = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
  });
  discountOperations.create(req, res, next);
});

const getAllDiscounts = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
    searchFields: ["discountCode", "discountName"],
  });
  discountOperations.getAll(req, res, next);
});

const getDiscountById = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
  });
  discountOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
  });
  discountOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Discount = getDiscountModel(req.restaurantDb);
  const discountOperations = crudOperations({
    mainModel: Discount,
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
