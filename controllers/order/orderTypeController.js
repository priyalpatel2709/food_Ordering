const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const { getOrderTypeModel } = require("../../models/index");

const createOrderType = asyncHandler(async (req, res, next) => {
  const OrderType = getOrderTypeModel(req.restaurantDb);
  const orderTypeOperations = crudOperations({
    mainModel: OrderType,
  });
  orderTypeOperations.create(req, res, next);
});

const getAllOrderTypes = asyncHandler(async (req, res, next) => {
  const OrderType = getOrderTypeModel(req.restaurantDb);
  const orderTypeOperations = crudOperations({
    mainModel: OrderType,
  });
  orderTypeOperations.getAll(req, res, next);
});

const getOrderTypeById = asyncHandler(async (req, res, next) => {
  const OrderType = getOrderTypeModel(req.restaurantDb);
  const orderTypeOperations = crudOperations({
    mainModel: OrderType,
  });
  orderTypeOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const OrderType = getOrderTypeModel(req.restaurantDb);
  const orderTypeOperations = crudOperations({
    mainModel: OrderType,
  });
  orderTypeOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const OrderType = getOrderTypeModel(req.restaurantDb);
  const orderTypeOperations = crudOperations({
    mainModel: OrderType,
  });
  orderTypeOperations.updateById(req, res, next);
});

module.exports = {
  createOrderType,
  getAllOrderTypes,
  getOrderTypeById,
  deleteById,
  updateById,
};
