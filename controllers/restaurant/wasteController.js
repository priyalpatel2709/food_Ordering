const asyncHandler = require("express-async-handler");
const { getWasteLogModel, getItemModel } = require("../../models/index");
const { HTTP_STATUS } = require("../../utils/const");

/**
 * Log a new waste entry
 * POST /api/v1/restaurant/waste
 */
const logWaste = asyncHandler(async (req, res) => {
    const { itemId, quantity, reason, note, costPerUnit } = req.body;
    const WasteLog = getWasteLogModel(req.restaurantDb);
    const Item = getItemModel(req.restaurantDb);

    // Validate item exists
    const item = await Item.findById(itemId);
    if (!item) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: "error",
            message: "Item not found",
        });
    }

    const wasteEntry = await WasteLog.create({
        restaurantId: `restaurant_${req.restaurantId}`,
        itemId,
        quantity,
        reason,
        note,
        costPerUnit: costPerUnit || 0,
        reportedBy: req.user._id,
    });

    // Populate item details for response
    await wasteEntry.populate("itemId", "name");
    await wasteEntry.populate("reportedBy", "name email");

    res.status(HTTP_STATUS.CREATED).json({
        status: "success",
        data: wasteEntry,
    });
});

/**
 * Get all waste logs with filtering
 * GET /api/v1/restaurant/waste?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&reason=expired
 */
const getWasteLogs = asyncHandler(async (req, res) => {
    const { startDate, endDate, reason, itemId } = req.query;
    const WasteLog = getWasteLogModel(req.restaurantDb);
    const Item = getItemModel(req.restaurantDb);

    const filter = {
        restaurantId: `restaurant_${req.restaurantId}`,
    };

    // Date filtering
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.createdAt.$lte = end;
        }
    }

    if (reason) filter.reason = reason;
    if (itemId) filter.itemId = itemId;

    const wasteLogs = await WasteLog.find(filter)
        .populate("itemId", "name price")
        .populate("reportedBy", "name email")
        .sort({ createdAt: -1 });

    const totalLoss = wasteLogs.reduce((sum, log) => sum + log.totalLoss, 0);

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        results: wasteLogs.length,
        totalLoss,
        data: wasteLogs,
    });
});

/**
 * Get waste statistics and analytics
 * GET /api/v1/restaurant/waste/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
const getWasteStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const WasteLog = getWasteLogModel(req.restaurantDb);

    const dateFilter = {
        restaurantId: `restaurant_${req.restaurantId}`,
    };

    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = end;
        }
    }

    const stats = await WasteLog.aggregate([
        { $match: dateFilter },
        {
            $facet: {
                // Overall summary
                summary: [
                    {
                        $group: {
                            _id: null,
                            totalWasteCount: { $sum: "$quantity" },
                            totalLoss: { $sum: "$totalLoss" },
                            totalEntries: { $sum: 1 },
                        },
                    },
                ],
                // Breakdown by reason
                byReason: [
                    {
                        $group: {
                            _id: "$reason",
                            count: { $sum: 1 },
                            totalQuantity: { $sum: "$quantity" },
                            totalLoss: { $sum: "$totalLoss" },
                        },
                    },
                    { $sort: { totalLoss: -1 } },
                ],
                // Top wasted items
                topWastedItems: [
                    {
                        $group: {
                            _id: "$itemId",
                            totalQuantity: { $sum: "$quantity" },
                            totalLoss: { $sum: "$totalLoss" },
                            occurrences: { $sum: 1 },
                        },
                    },
                    { $sort: { totalLoss: -1 } },
                    { $limit: 10 },
                    {
                        $lookup: {
                            from: "items",
                            localField: "_id",
                            foreignField: "_id",
                            as: "itemDetails",
                        },
                    },
                    { $unwind: "$itemDetails" },
                    {
                        $project: {
                            itemName: "$itemDetails.name",
                            totalQuantity: 1,
                            totalLoss: 1,
                            occurrences: 1,
                        },
                    },
                ],
                // Waste trend over time
                wasteTrend: [
                    {
                        $group: {
                            _id: {
                                $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
                            },
                            totalLoss: { $sum: "$totalLoss" },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { _id: 1 } },
                ],
                // Staff accountability
                byStaff: [
                    {
                        $group: {
                            _id: "$reportedBy",
                            totalLoss: { $sum: "$totalLoss" },
                            count: { $sum: 1 },
                        },
                    },
                    { $sort: { count: -1 } },
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "_id",
                            as: "staffDetails",
                        },
                    },
                    { $unwind: "$staffDetails" },
                    {
                        $project: {
                            staffName: "$staffDetails.name",
                            totalLoss: 1,
                            count: 1,
                        },
                    },
                ],
            },
        },
    ]);

    const result = stats[0];

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: {
            summary: result.summary[0] || {
                totalWasteCount: 0,
                totalLoss: 0,
                totalEntries: 0,
            },
            byReason: result.byReason,
            topWastedItems: result.topWastedItems,
            wasteTrend: result.wasteTrend,
            byStaff: result.byStaff,
        },
    });
});

/**
 * Delete a waste log entry
 * DELETE /api/v1/restaurant/waste/:id
 */
const deleteWasteLog = asyncHandler(async (req, res) => {
    const WasteLog = getWasteLogModel(req.restaurantDb);

    const wasteLog = await WasteLog.findByIdAndDelete(req.params.id);

    if (!wasteLog) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
            status: "error",
            message: "Waste log not found",
        });
    }

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        message: "Waste log deleted successfully",
    });
});

module.exports = {
    logWaste,
    getWasteLogs,
    getWasteStats,
    deleteWasteLog,
};
