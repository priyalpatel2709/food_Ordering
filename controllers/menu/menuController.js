const asyncHandler = require("express-async-handler");
const createError = require("http-errors");
const crudOperations = require("../../utils/crudOperations");
const {
  getMenuModel,
  getCategoryModel,
  getItemModel,
  getTaxModel,
  getCustomizationOptionModel,
} = require("../../models/index");
const { getQueryParams } = require("../../utils/utils");
const { format } = require("date-fns");

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
  const CustomizationOptions = getCustomizationOptionModel(req.restaurantDb);

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
        populateFields: [
          {
            field: "customizationOptions",
            model: CustomizationOptions,
          },
        ],
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
  const CustomizationOptions = getCustomizationOptionModel(req.restaurantDb);

  const menuOperations = crudOperations({
    mainModel: Menu,
    populateModels: [
      {
        field: "categories",
        model: Category,
        select: getQueryParams(req.queryOptions?.select?.category),
      },
      {
        field: "items.item",
        model: Item,
        select: getQueryParams(req.queryOptions?.select?.item),
        populateFields: [
          {
            field: "customizationOptions",
            model: CustomizationOptions,
          },
        ],
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

const currentMenu = asyncHandler(async (req, res, next) => {
  try {
    const { restaurantDb } = req;
    if (!restaurantDb) {
      return res.status(400).json({
        success: false,
        message: "Restaurant database connection not available",
      });
    }

    const Menu = getMenuModel(restaurantDb);
    const Category = getCategoryModel(restaurantDb);
    const Item = getItemModel(restaurantDb);
    const CustomizationOptions = getCustomizationOptionModel(restaurantDb);

    const now = new Date();
    const day = format(now, "EEEE");
    const currentTime = format(now, "HH:mm");
    const date = format(now, "yyyy/MM/dd");

    // Create query
    const menuQuery = {
      isActive: true,
      "availableDays.day": day, //* make change
      "availableDays.timeSlots": {
        $elemMatch: {
          openTime: { $lte: currentTime }, //* make change
          closeTime: { $gte: currentTime }, //* make change
        },
      },
    };

    // Performance optimizations for large data sets
    const menus = await Menu.find(menuQuery)
      .select(
        "-availableDays -taxes -discounts -metaData -createdAt -updatedAt -__v"
      )
      .lean()
      .populate({
        path: "categories",
        model: Category,
        select: "name description isActive displayOrder categoryImage _id",
        match: { isActive: true },
        options: { sort: { displayOrder: 1 } },
      })
      .populate({
        path: "items.item",
        model: Item,
        select: "-restaurantId -__v -createdAt -updatedAt -price",
        populate: [
          {
            path: "customizationOptions",
            model: CustomizationOptions,
            select: "-createdAt -updatedAt -__v -_id -restaurantId -metaData",
          },
          {
            path: "category",
            model: Category,
            select: "_id",
          },
        ],
      })
      .exec();

    if (!menus || menus.length === 0) {
      return res.status(200).json({
        success: true,
        message: "No active menus available for the current time",
        menus: [],
        currentDay: day,
        currentTime: currentTime,
      });
    }

    // Process menus with careful error handling
    const updatedMenus = menus.map((menu) => {
      // Process categories
      const filteredCategories = (menu.categories || []).filter(Boolean);

      // Process items safely
      const processedItems = (menu.items || [])
        .map((item) => {
          if (!item || !item.item) return null;

          // Handle defaultPrice safely
          const basePrice =
            typeof item.item.price === "number" ? item.item.price : 0;

          // Find applicable special event pricing with validation
          let adjustedPrice = basePrice;
          if (Array.isArray(item.specialEventPricing)) {
            const specialEvent = item.specialEventPricing.find(
              (event) => event && event.date === date
            );

            if (
              specialEvent &&
              typeof specialEvent.priceMultiplier === "number" &&
              specialEvent.priceMultiplier > 0
            ) {
              adjustedPrice = basePrice * specialEvent.priceMultiplier;
            }
          }

          // Format price to 2 decimal places
          adjustedPrice = parseFloat(adjustedPrice.toFixed(2));

          return {
            ...item,
            finalPrice: adjustedPrice,
            // Remove unnecessary nested objects to reduce payload size
            specialEventPricing: undefined,
            timeBasedPricing: undefined,
            membershipPricing: undefined,
            bulkPricing: undefined,
            locationPricing: undefined,
            comboPricing: undefined,
            additionalFees: undefined,
          };
        })
        .filter(Boolean);

      return {
        _id: menu._id,
        name: menu.name,
        description: menu.description,
        categories: filteredCategories,
        items: processedItems,
      };
    });

    return res.status(200).json({
      menus: updatedMenus,
      currentTime: currentTime,
    });
  } catch (error) {
    next(
      createError(500, "Error fetching Current Menu", { error: error.message })
    );
  }
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
  currentMenu,
};
