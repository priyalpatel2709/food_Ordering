const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const { getTaxModel } = require("../../models/index");
const { CACHE_PREFIXES } = require("../../utils/cache");

const createTax = asyncHandler(async (req, res, next) => {
  const Tax = getTaxModel(req.restaurantDb);
  const taxOperations = crudOperations({
    mainModel: Tax,
    cacheKeyPrefix: CACHE_PREFIXES.TAXES,
  });
  taxOperations.create(req, res, next);
});

const getAllTaxes = asyncHandler(async (req, res, next) => {
  const Tax = getTaxModel(req.restaurantDb);
  const taxOperations = crudOperations({
    mainModel: Tax,
    cacheKeyPrefix: CACHE_PREFIXES.TAXES,
    searchFields: ["name"],
  });
  taxOperations.getAll(req, res, next);
});

const getTaxById = asyncHandler(async (req, res, next) => {
  const Tax = getTaxModel(req.restaurantDb);
  const taxOperations = crudOperations({
    mainModel: Tax,
    cacheKeyPrefix: CACHE_PREFIXES.TAXES,
  });
  taxOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Tax = getTaxModel(req.restaurantDb);
  const taxOperations = crudOperations({
    mainModel: Tax,
    cacheKeyPrefix: CACHE_PREFIXES.TAXES,
  });
  taxOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Tax = getTaxModel(req.restaurantDb);
  const taxOperations = crudOperations({
    mainModel: Tax,
    cacheKeyPrefix: CACHE_PREFIXES.TAXES,
  });
  taxOperations.updateById(req, res, next);
});

module.exports = {
  createTax,
  getTaxById,
  getAllTaxes,
  deleteById,
  updateById,
};
