const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const {
  getItemModel,
  getCategoryModel,
  getCustomizationOptionModel,
  getTaxModel,
} = require("../../models/index");
const { getQueryParams } = require("../../utils/utils");

const createItem = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const itemOperations = crudOperations({
    mainModel: Item,
  });
  itemOperations.create(req, res, next);
});

const getAllItems = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const Category = getCategoryModel(req.restaurantDb);
  const CustomizationOptions = getCustomizationOptionModel(req.restaurantDb);
  const TaxRate = getTaxModel(req.restaurantDb);

  const { category, customizationOptions, taxRate } = req.query;

  const itemOperations = crudOperations({
    mainModel: Item,
    populateModels: [
      {
        field: "category",
        model: Category,
        select: getQueryParams(category),
      },
      {
        field: "customizationOptions",
        model: CustomizationOptions,
        select: getQueryParams(customizationOptions),
      },
      {
        field: "taxRate",
        model: TaxRate,
        select: getQueryParams(taxRate),
      },
    ],
  });
  itemOperations.getAll(req, res, next);
});

const getItemById = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const Category = getCategoryModel(req.restaurantDb);
  const CustomizationOptions = getCustomizationOptionModel(req.restaurantDb);
  const TaxRate = getTaxModel(req.restaurantDb);
  const { category, customizationOptions, taxRate } = req.query;
  const itemOperations = crudOperations({
    mainModel: Item,
    populateModels: [
      {
        field: "category",
        model: Category,
        select: getQueryParams(category),
      },
      {
        field: "customizationOptions",
        model: CustomizationOptions,
        select: getQueryParams(customizationOptions),
      },
      {
        field: "taxRate",
        model: TaxRate,
        select: getQueryParams(taxRate),
      },
    ],
  });
  itemOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const itemOperations = crudOperations({
    mainModel: Item,
  });
  itemOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const itemOperations = crudOperations({
    mainModel: Item,
  });
  itemOperations.updateById(req, res, next);
});



module.exports = {
  createItem,
  getItemById,
  getAllItems,
  deleteById,
  updateById,
};
