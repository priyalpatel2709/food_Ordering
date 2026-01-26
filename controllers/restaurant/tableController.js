const asyncHandler = require("express-async-handler");
const { getTableModel, getRestaurantModel } = require("../../models/index");
const { HTTP_STATUS } = require("../../utils/const");
const crudOperations = require("../../utils/crudOperations");

/**
 * Helper to sync restaurant totalTables count
 */
const syncRestaurantTableCount = async (restaurantDb, restaurantId) => {
  const Table = getTableModel(restaurantDb);
  const Restaurant = getRestaurantModel(restaurantDb);
  const count = await Table.countDocuments();
  await Restaurant.findOneAndUpdate(
    { restaurantId: `restaurant_${restaurantId}` },
    { "tableConfiguration.totalTables": count },
  );
};

/**
 * Create a new table
 * POST /api/v1/restaurant/tables
 */
const createTable = asyncHandler(async (req, res, next) => {
  const Table = getTableModel(req.restaurantDb);

  const existingTable = await Table.findOne({
    tableNumber: req.body.tableNumber,
  });

  if (existingTable) {
    return res.status(HTTP_STATUS.CONFLICT).json({
      status: "error",
      message: `Table number ${req.body.tableNumber} already exists`,
    });
  }

  const newTable = new Table({
    ...req.body,
    // restaurantId: `restaurant_${req.restaurantId}`,
  });

  const savedTable = await newTable.save();
  await syncRestaurantTableCount(req.restaurantDb, req.restaurantId);

  res.status(HTTP_STATUS.CREATED).json({
    status: "success",
    data: savedTable,
  });
});

/**
 * Get all tables
 * GET /api/v1/restaurant/tables
 */
const getAllTables = asyncHandler(async (req, res, next) => {
  const Table = getTableModel(req.restaurantDb);
  const tableOperations = crudOperations({
    mainModel: Table,
  });
  tableOperations.getAll(req, res, next);
});

/**
 * Get table by ID
 * GET /api/v1/restaurant/tables/:id
 */
const getTableById = asyncHandler(async (req, res, next) => {
  const Table = getTableModel(req.restaurantDb);
  const tableOperations = crudOperations({
    mainModel: Table,
  });
  tableOperations.getById(req, res, next);
});

/**
 * Update table
 * PUT /api/v1/restaurant/tables/:id
 */
const updateTable = asyncHandler(async (req, res, next) => {
  const Table = getTableModel(req.restaurantDb);
  const tableOperations = crudOperations({
    mainModel: Table,
  });
  tableOperations.updateById(req, res, next);
});

/**
 * Delete table
 * DELETE /api/v1/restaurant/tables/:id
 */
const deleteTable = asyncHandler(async (req, res, next) => {
  const Table = getTableModel(req.restaurantDb);
  const deleted = await Table.findByIdAndDelete(req.params.id);

  if (deleted) {
    await syncRestaurantTableCount(req.restaurantDb, req.restaurantId);
  }

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "Table deleted successfully",
  });
});

/**
 * Bulk create tables
 * POST /api/v1/restaurant/tables/bulk
 */
const bulkCreateTables = asyncHandler(async (req, res) => {
  const { totalTables, seatingCapacity = 2 } = req.body;
  const Table = getTableModel(req.restaurantDb);

  if (!totalTables || isNaN(totalTables) || totalTables < 1) {
    return res.status(HTTP_STATUS.BAD_REQUEST).json({
      status: "error",
      message: "Total tables count is required and must be a positive number",
    });
  }

  const existingCount = await Table.countDocuments();
  const tablesToCreate = [];

  for (let i = 1; i <= totalTables; i++) {
    const tableNumber = (existingCount + i).toString();
    tablesToCreate.push({
      restaurantId: `restaurant_${req.restaurantId}`,
      tableNumber,
      seatingCapacity,
      status: "available",
    });
  }

  const createdTables = await Table.insertMany(tablesToCreate);
  await syncRestaurantTableCount(req.restaurantDb, req.restaurantId);

  res.status(HTTP_STATUS.CREATED).json({
    status: "success",
    message: `${createdTables.length} tables created successfully`,
    data: createdTables,
  });
});

/**
 * Get Table QR Code Info
 * GET /api/v1/restaurant/tables/:id/qrcode
 */
const getTableQRCode = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const Table = getTableModel(req.restaurantDb);
  const table = await Table.findById(id);

  if (!table) {
    return res
      .status(HTTP_STATUS.NOT_FOUND)
      .json({ message: "Table not found" });
  }

  const baseUrl =
    process.env.CUSTOMER_APP_URL || "https://order.yourdomain.com";
  const qrUrl = `${baseUrl}/scan?restaurantId=${req.restaurantId}&tableNumber=${table.tableNumber}`;

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    data: {
      tableNumber: table.tableNumber,
      qrUrl,
      instructions: "Use this URL to generate a QR code for the table.",
    },
  });
});

/**
 * Reset All Tables
 * POST /api/v1/restaurant/tables/reset
 */
const resetAllTables = asyncHandler(async (req, res) => {
  const Table = getTableModel(req.restaurantDb);

  await Table.updateMany(
    {},
    {
      status: "available",
      currentOrderId: null,
    },
  );

  res.status(HTTP_STATUS.OK).json({
    status: "success",
    message: "All tables have been reset to available",
  });
});

module.exports = {
  createTable,
  getAllTables,
  getTableById,
  updateTable,
  deleteTable,
  bulkCreateTables,
  getTableQRCode,
  resetAllTables,
};
