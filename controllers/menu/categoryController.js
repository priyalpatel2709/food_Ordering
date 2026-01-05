const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const { getCategoryModel } = require("../../models/index");

const createCategory = asyncHandler(async (req, res, next) => {
  const Category = getCategoryModel(req.restaurantDb);
  const categoryOperations = crudOperations({
    mainModel: Category,
  });
  categoryOperations.create(req, res, next);
});

const getAllCategories = asyncHandler(async (req, res, next) => {
  const Category = getCategoryModel(req.restaurantDb);
  const categoryOperations = crudOperations({
    mainModel: Category,
    searchFields: ["name", "description"],
  });
  categoryOperations.getAll(req, res, next);
});

const getCategoryById = asyncHandler(async (req, res, next) => {
  const Category = getCategoryModel(req.restaurantDb);
  const categoryOperations = crudOperations({
    mainModel: Category,
  });
  categoryOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Category = getCategoryModel(req.restaurantDb);
  const categoryOperations = crudOperations({
    mainModel: Category,
  });
  categoryOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Category = getCategoryModel(req.restaurantDb);
  const categoryOperations = crudOperations({
    mainModel: Category,
  });
  categoryOperations.updateById(req, res, next);
});

module.exports = {
  createCategory,
  getCategoryById,
  getAllCategories,
  deleteById,
  updateById,
};
