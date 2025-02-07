const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const { getCustomizationOptionModel } = require("../../models/index");

const createCustomizationOption = asyncHandler(async (req, res, next) => {
  const CustomizationOption = getCustomizationOptionModel(req.restaurantDb);
  const customizationOptionOperations = crudOperations({
    mainModel: CustomizationOption,
  });
  customizationOptionOperations.create(req, res, next);
});

const getAllCustomizationOptions = asyncHandler(async (req, res, next) => {
  const CustomizationOption = getCustomizationOptionModel(req.restaurantDb);
  const customizationOptionOperations = crudOperations({
    mainModel: CustomizationOption,
  });
  customizationOptionOperations.getAll(req, res, next);
});

const getCustomizationOptionById = asyncHandler(async (req, res, next) => {
  const CustomizationOption = getCustomizationOptionModel(req.restaurantDb);
  const customizationOptionOperations = crudOperations({
    mainModel: CustomizationOption,
  });
  customizationOptionOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const CustomizationOption = getCustomizationOptionModel(req.restaurantDb);
  const customizationOptionOperations = crudOperations({
    mainModel: CustomizationOption,
  });
  customizationOptionOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const CustomizationOption = getCustomizationOptionModel(req.restaurantDb);
  const customizationOptionOperations = crudOperations({
    mainModel: CustomizationOption,
  });
  customizationOptionOperations.updateById(req, res, next);
});

module.exports = {
  createCustomizationOption,
  getCustomizationOptionById,
  getAllCustomizationOptions,
  deleteById,
  updateById,
};
