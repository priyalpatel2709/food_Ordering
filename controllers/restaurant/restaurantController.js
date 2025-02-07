const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const { getRestaurantModel } = require("../../models/index");
const createError = require("http-errors");

const createRestaurant = asyncHandler(async (req, res, next) => {
  const Restaurant = getRestaurantModel(req.restaurantDb);
  const restaurantOperations = crudOperations({
    mainModel: Restaurant,
  });
  restaurantOperations.create(req, res, next);
});

const getRestaurantById = asyncHandler(async (req, res, next) => {
  const Restaurant = getRestaurantModel(req.restaurantDb);
  const restaurantOperations = crudOperations({
    mainModel: Restaurant,
  });
  restaurantOperations.getById(req, res, next);
});

const getAllRestaurants = asyncHandler(async (req, res, next) => {
  const Restaurant = getRestaurantModel(req.restaurantDb);
  const restaurantOperations = crudOperations({
    mainModel: Restaurant,
  });
  restaurantOperations.getAll(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Restaurant = getRestaurantModel(req.restaurantDb);
  const restaurantOperations = crudOperations({
    mainModel: Restaurant,
  });
  restaurantOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Restaurant = getRestaurantModel(req.restaurantDb);
  const restaurantOperations = crudOperations({
    mainModel: Restaurant,
  });
  restaurantOperations.updateById(req, res, next);
});

module.exports = {
  createRestaurant,
  getRestaurantById,
  getAllRestaurants,
  deleteById,
  updateById,
};
