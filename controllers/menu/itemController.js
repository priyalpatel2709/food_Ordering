const asyncHandler = require("express-async-handler");
const crudOperations = require("../../utils/crudOperations");
const xlsx = require("xlsx");
const {
  getItemModel,
  getCategoryModel,
  getCustomizationOptionModel,
  getTaxModel,
} = require("../../models/index");
const { getQueryParams } = require("../../utils/utils");

const { CACHE_PREFIXES, invalidate, getRestaurantKey } = require("../../utils/cache");

const createItem = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const itemOperations = crudOperations({
    mainModel: Item,
    cacheKeyPrefix: CACHE_PREFIXES.ITEMS,
  });
  itemOperations.create(req, res, next);
});

const bulkUploadItems = asyncHandler(async (req, res, next) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ status: "error", message: "Please upload an Excel file" });
  }

  const Item = getItemModel(req.restaurantDb);
  const Category = getCategoryModel(req.restaurantDb);
  const Tax = getTaxModel(req.restaurantDb);

  const workbook = xlsx.read(req.file.buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet);

  if (data.length === 0) {
    return res
      .status(400)
      .json({ status: "error", message: "Excel sheet is empty" });
  }

  const categories = await Category.find({});
  const taxes = await Tax.find({});

  const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c._id]));
  const taxMap = new Map(taxes.map((t) => [t.name.toLowerCase(), t._id]));

  const itemsToInsert = [];
  const errors = [];

  for (const [index, row] of data.entries()) {
    try {
      const {
        Name,
        Description,
        Price,
        Category: CategoryName,
        Tax: TaxName,
        IsAvailable,
        PreparationTime,
        MeatType // Assuming "Veg", "Non-Veg", "Egg" or similar
      } = row;

      if (!Name || !Price || !CategoryName) {
        errors.push(`Row ${index + 2}: Missing required fields (Name, Price, Category)`);
        continue;
      }

      const categoryId = categoryMap.get(CategoryName.toString().trim().toLowerCase());
      if (!categoryId) {
        errors.push(`Row ${index + 2}: Category '${CategoryName}' not found`);
        continue;
      }

      let taxId = null;
      if (TaxName) {
        taxId = taxMap.get(TaxName.toString().trim().toLowerCase());
      }

      // Default to first tax if not specified but tax exists? No, better leave null or handle defaults at schema level
      // Actually schema usually requires taxRate if taxable. Let's assume input is correct or handle strictly.

      itemsToInsert.push({
        restaurantId: req.user.restaurantId,
        name: Name,
        description: Description || "",
        price: parseFloat(Price),
        category: categoryId,
        taxRate: taxId,
        isAvailable: IsAvailable !== undefined ? IsAvailable : true,
        preparationTime: PreparationTime || 15,
        meatType: MeatType || "Veg", // Default
        // Add other fields as needed
      });

    } catch (err) {
      errors.push(`Row ${index + 2}: ${err.message}`);
    }
  }

  if (itemsToInsert.length > 0) {
    await Item.insertMany(itemsToInsert);
    // Invalidate cache after bulk insert
    invalidate(getRestaurantKey(CACHE_PREFIXES.ITEMS, req.restaurantId));
  }

  res.status(201).json({
    status: "success",
    message: `Successfully imported ${itemsToInsert.length} items`,
    errors: errors.length > 0 ? errors : undefined,
  });
});

const getAllItems = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const Category = getCategoryModel(req.restaurantDb);
  const CustomizationOptions = getCustomizationOptionModel(req.restaurantDb);
  const TaxRate = getTaxModel(req.restaurantDb);


  const itemOperations = crudOperations({
    mainModel: Item,
    searchFields: ["name", "description"],
    cacheKeyPrefix: CACHE_PREFIXES.ITEMS,
    populateModels: [
      {
        field: "category",
        model: Category,
        select: getQueryParams(req.queryOptions?.select?.category),
      },
      {
        field: "customizationOptions",
        model: CustomizationOptions,
        select: getQueryParams(req.queryOptions?.select?.customizationOptions),
      },
      {
        field: "taxRate",
        model: TaxRate,
        select: getQueryParams(req.queryOptions?.select?.taxRate),
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

  const itemOperations = crudOperations({
    mainModel: Item,
    cacheKeyPrefix: CACHE_PREFIXES.ITEMS,
    populateModels: [
      {
        field: "category",
        model: Category,
        select: getQueryParams(req.queryOptions?.select?.category),
      },
      {
        field: "customizationOptions",
        model: CustomizationOptions,
        select: getQueryParams(req.queryOptions?.select?.customizationOptions),
      },
      {
        field: "taxRate",
        model: TaxRate,
        select: getQueryParams(req.queryOptions?.select?.taxRate),
      },
    ],
  });
  itemOperations.getById(req, res, next);
});

const deleteById = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const itemOperations = crudOperations({
    mainModel: Item,
    cacheKeyPrefix: CACHE_PREFIXES.ITEMS,
  });
  itemOperations.deleteById(req, res, next);
});

const updateById = asyncHandler(async (req, res, next) => {
  const Item = getItemModel(req.restaurantDb);
  const itemOperations = crudOperations({
    mainModel: Item,
    cacheKeyPrefix: CACHE_PREFIXES.ITEMS,
  });
  itemOperations.updateById(req, res, next);
});

module.exports = {
  createItem,
  bulkUploadItems,
  getItemById,
  getAllItems,
  deleteById,
  updateById,
};
