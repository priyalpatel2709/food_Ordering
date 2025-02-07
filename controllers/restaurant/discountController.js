const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const { getDiscountModel } = require("../../models/index");
const createError = require("http-errors");