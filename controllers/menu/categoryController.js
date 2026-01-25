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

const reorderCategories = asyncHandler(async (req, res) => {
  const Category = getCategoryModel(req.restaurantDb);
  const { orders } = req.body; // Array of { id: string, displayOrder: number }

  if (!orders || !Array.isArray(orders)) {
    return res
      .status(400)
      .json({ status: "error", message: "Orders array is required" });
  }

  const bulkOps = orders.map((item) => ({
    updateOne: {
      filter: { _id: item.id },
      update: { $set: { displayOrder: item.displayOrder } },
    },
  }));

  await Category.bulkWrite(bulkOps);

  res.status(200).json({
    status: "success",
    message: "Categories reordered successfully",
  });
});

module.exports = {
  createCategory,
  getCategoryById,
  getAllCategories,
  deleteById,
  updateById,
  reorderCategories,
};
