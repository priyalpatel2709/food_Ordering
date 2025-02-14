const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const {
  getMenuModel,
  getCategoryModel,
  getItemModel,
  getTaxModel,
} = require("../../models/index");
const { getQueryParams } = require("../../utils/utils");

const createMenu = asyncHandler(async (req, res, next) => {
  const Menu = getMenuModel(req.restaurantDb);
  const menuOperations = crudOperations({
    mainModel: Menu,
  });
  menuOperations.create(req, res, next);
});

const getAllMenus = asyncHandler(async (req, res, next) => {
  // need to work on this

  const Menu = getMenuModel(req.restaurantDb);
  const Category = getCategoryModel(req.restaurantDb);
  const Item = getItemModel(req.restaurantDb);
  const TaxRate = getTaxModel(req.restaurantDb);

  const menuOperations = crudOperations({
    mainModel: Menu,
    populateModels: [
      {
        field: "categories",
        model: Category,
        select: getQueryParams(req.queryOptions?.select?.category),
      },
      {
        field: "items.itemId",
        model: Item,
        select: getQueryParams(req.queryOptions?.select?.item),
      },
      {
        field: "taxes",
        model: TaxRate,
        select: getQueryParams(req.queryOptions?.select?.taxRate),
      },
    ],
  });

  menuOperations.getAll(req, res, next);
});

const getMenuById = asyncHandler(async (req, res, next) => {
  const Menu = getMenuModel(req.restaurantDb);
  const Category = getCategoryModel(req.restaurantDb);
  const Item = getItemModel(req.restaurantDb);
  const TaxRate = getTaxModel(req.restaurantDb);

  const menuOperations = crudOperations({
    mainModel: Menu,
    populateModels: [
      {
        field: "categories",
        model: Category,
        select: getQueryParams(req.queryOptions?.select?.category),
      },
      {
        field: "items.itemId",
        model: Item,
        select: getQueryParams(req.queryOptions?.select?.item),
      },
      {
        field: "taxes",
        model: TaxRate,
        select: getQueryParams(req.queryOptions?.select?.taxRate),
      },
    ],
  });
  menuOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Menu = getMenuModel(req.restaurantDb);
  const menuOperations = crudOperations({
    mainModel: Menu,
  });
  menuOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Menu = getMenuModel(req.restaurantDb);
  const menuOperations = crudOperations({
    mainModel: Menu,
  });
  menuOperations.updateById(req, res, next);
});

module.exports = {
  createMenu,
  getMenuById,
  getAllMenus,
  deleteById,
  updateById,
};
