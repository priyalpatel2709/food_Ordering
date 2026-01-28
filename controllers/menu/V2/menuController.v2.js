const asyncHandler = require("express-async-handler");
const createError = require("http-errors");
const mongoose = require("mongoose");
const { getMenuModel } = require("../../../models/index");

const { format } = require("date-fns");
const { CACHE_PREFIXES, getRestaurantKey, getOrSet } = require("../../../utils/cache");

const currentMenu = asyncHandler(async (req, res, next) => {
  try {
    const { restaurantDb } = req;
    const { menuId } = req.query;

    if (!restaurantDb) {
      return res.status(400).json({
        success: false,
        message: "Restaurant database connection not available",
      });
    }

    const Menu = getMenuModel(restaurantDb);

    const now = new Date();
    const currentDay = format(now, "EEEE"); // e.g., "Friday"
    const currentTime = format(now, "HH:mm"); // e.g., "12:40"
    const currentDate = format(now, "yyyy/MM/dd"); // e.g., "2025/04/25"

    const matchStage = {
      isActive: true,
    };

    // If menuId is provided → filter by menuId only
    if (menuId) {
      matchStage._id = new mongoose.Types.ObjectId(menuId);
    }
    // Else → filter by availability
    else {
      matchStage["availableDays.day"] = currentDay;
      matchStage["availableDays.timeSlots"] = {
        $elemMatch: {
          openTime: { $lte: currentTime },
          closeTime: { $gt: currentTime },
        },
      };
    }

    const cacheKey = getRestaurantKey(CACHE_PREFIXES.MENU, req.restaurantId) + (menuId ? `_${menuId}` : `_current_${currentDay}_${currentTime}`);

    const menus = await getOrSet(cacheKey, async () => {
      return await Menu.aggregate([
        {
          $match: matchStage,
        },
        {
          $lookup: {
            from: "categories",
            localField: "categories",
            foreignField: "_id",
            as: "categories",
          },
        },
        {
          $addFields: {
            categories: {
              $filter: {
                input: "$categories",
                as: "cat",
                cond: { $eq: ["$$cat.isActive", true] },
              },
            },
          },
        },
        {
          $lookup: {
            from: "items",
            localField: "items.item",
            foreignField: "_id",
            as: "resolvedItems",
          },
        },
        {
          $unwind: "$items",
        },
        {
          $addFields: {
            currentItem: {
              $arrayElemAt: [
                {
                  $filter: {
                    input: "$resolvedItems",
                    as: "ri",
                    cond: { $eq: ["$$ri._id", "$items.item"] },
                  },
                },
                0,
              ],
            },
          },
        },
        {
          $lookup: {
            from: "customizationoptions",
            localField: "currentItem.customizationOptions",
            foreignField: "_id",
            as: "currentItem.customizationOptions",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "currentItem.category",
            foreignField: "_id",
            as: "currentItem.category",
          },
        },
        {
          $lookup: {
            from: "taxes",
            localField: "currentItem.taxRate",
            foreignField: "_id",
            as: "currentItem.taxRate",
          },
        },
        {
          $addFields: {
            currentItem: {
              $mergeObjects: [
                "$currentItem",
                {
                  taxRate: { $arrayElemAt: ["$currentItem.taxRate", 0] },
                  category: { $arrayElemAt: ["$currentItem.category", 0] },
                },
              ],
            },
          },
        },
        {
          $addFields: {
            "currentItem.finalPrice": {
              $cond: [
                {
                  $gt: [
                    {
                      $size: {
                        $filter: {
                          input: "$items.specialEventPricing",
                          as: "event",
                          cond: {
                            $eq: ["$$event.date", currentDate],
                          },
                        },
                      },
                    },
                    0,
                  ],
                },
                {
                  $multiply: [
                    "$currentItem.price",
                    {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: {
                              $filter: {
                                input: "$items.specialEventPricing",
                                as: "event",
                                cond: { $eq: ["$$event.date", currentDate] },
                              },
                            },
                            as: "se",
                            in: "$$se.priceMultiplier",
                          },
                        },
                        0,
                      ],
                    },
                  ],
                },
                "$currentItem.price",
              ],
            },
          },
        },
        {
          $group: {
            _id: "$_id",
            name: { $first: "$name" },
            description: { $first: "$description" },
            categories: { $first: "$categories" },
            items: {
              $push: {
                ...{
                  $mergeObjects: [
                    "$items",
                    {
                      item: {
                        $mergeObjects: [
                          "$currentItem",
                          {
                            price: "$currentItem.finalPrice",
                          },
                        ],
                      },
                    },
                  ],
                },
              },
            },
          },
        },
        {
          $project: {
            "items.specialEventPricing": 0,
            "items.timeBasedPricing": 0,
            "items.membershipPricing": 0,
            "items.bulkPricing": 0,
            "items.locationPricing": 0,
            "items.comboPricing": 0,
            "items.additionalFees": 0,
          },
        },
      ]);
    });

    return res.status(200).json({
      success: true,
      currentDay,
      currentTime,
      menus,
    });
  } catch (error) {
    next(
      createError(500, "Error fetching Current Menu", {
        error: error.message,
      }),
    );
  }
});

module.exports = {
  currentMenu,
};
