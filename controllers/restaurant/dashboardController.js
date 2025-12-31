const asyncHandler = require("express-async-handler");
const { getOrderModel } = require("../../models/index");
const { ORDER_STATUS, HTTP_STATUS } = require("../../utils/const");
const mongoose = require("mongoose");

/**
 * Get Restaurant Dashboard Statistics
 * GET /api/v1/restaurant/dashboard/stats?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
 */
const getDashboardStats = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const restaurantId = `restaurant_${req.restaurantId}`;
    const Order = getOrderModel(req.restaurantDb);

    // Date Filtering logic
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = end;
        }
    }

    // 1. Overall Summary Aggregation
    const summaryStats = await Order.aggregate([
        {
            $match: {
                restaurantId,
                orderStatus: ORDER_STATUS.COMPLETED,
                ...dateFilter
            }
        },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$orderFinalCharge" },
                totalTax: { $sum: "$tax.totalTaxAmount" },
                totalDiscount: { $sum: "$discount.totalDiscountAmount" },
                totalNetSales: { $sum: "$subtotal" }, // Sales before tax/tips
                totalOrders: { $sum: 1 },
                avgOrderValue: { $avg: "$orderFinalCharge" }
            }
        }
    ]);

    const summary = summaryStats[0] || {
        totalSales: 0,
        totalTax: 0,
        totalDiscount: 0,
        totalNetSales: 0,
        totalOrders: 0,
        avgOrderValue: 0
    };

    // 2. Order Status Breakdown
    const statusBreakdown = await Order.aggregate([
        {
            $match: {
                restaurantId,
                ...dateFilter
            }
        },
        {
            $group: {
                _id: "$orderStatus",
                count: { $sum: 1 },
                amount: { $sum: "$orderFinalCharge" }
            }
        }
    ]);

    // 3. Top Selling Items
    const topItems = await Order.aggregate([
        {
            $match: {
                restaurantId,
                orderStatus: ORDER_STATUS.COMPLETED,
                ...dateFilter
            }
        },
        { $unwind: "$orderItems" },
        {
            $group: {
                _id: "$orderItems.item",
                quantitySold: { $sum: "$orderItems.quantity" },
                revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } }
            }
        },
        { $sort: { quantitySold: -1 } },
        { $limit: 10 },
        {
            $lookup: {
                from: "items", // This might need adjustment if using multiple DBs, but Mongoose aggregate uses collection name
                localField: "_id",
                foreignField: "_id",
                as: "itemDetails"
            }
        },
        { $unwind: "$itemDetails" },
        {
            $project: {
                name: "$itemDetails.name",
                quantitySold: 1,
                revenue: 1
            }
        }
    ]);

    // 4. Sales by Source (Staff vs Customer)
    const sourceBreakdown = await Order.aggregate([
        {
            $match: {
                restaurantId,
                orderStatus: ORDER_STATUS.COMPLETED,
                ...dateFilter
            }
        },
        {
            $group: {
                _id: { $ifNull: ["$source", "staff"] },
                count: { $sum: 1 },
                revenue: { $sum: "$orderFinalCharge" }
            }
        }
    ]);

    // 5. Peak Hours Analysis (Orders by Hour of Day)
    const peakHours = await Order.aggregate([
        {
            $match: {
                restaurantId,
                orderStatus: ORDER_STATUS.COMPLETED,
                ...dateFilter
            }
        },
        {
            $project: {
                hour: { $hour: "$createdAt" }
            }
        },
        {
            $group: {
                _id: "$hour",
                count: { $sum: 1 }
            }
        },
        { $sort: { _id: 1 } }
    ]);

    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: {
            summary,
            statusBreakdown,
            topItems,
            sourceBreakdown,
            peakHours,
            period: {
                startDate: startDate || 'Beginning of time',
                endDate: endDate || 'Last record'
            }
        }
    });
});

/**
 * Export Dashboard Report as PDF
 * GET /api/v1/restaurant/dashboard/export?startDate=...&endDate=...
 */
const exportDashboardReport = asyncHandler(async (req, res) => {
    const { startDate, endDate } = req.query;
    const restaurantId = `restaurant_${req.restaurantId}`;
    const Order = getOrderModel(req.restaurantDb);
    const Restaurant = require("../../models/index").getRestaurantModel(req.restaurantDb);

    const restaurant = await Restaurant.findOne({ restaurantId });

    // Date Filtering logic
    const dateFilter = {};
    if (startDate || endDate) {
        dateFilter.createdAt = {};
        if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
        if (endDate) {
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            dateFilter.createdAt.$lte = end;
        }
    }

    // Reuse summary aggregation
    const summaryStats = await Order.aggregate([
        { $match: { restaurantId, orderStatus: ORDER_STATUS.COMPLETED, ...dateFilter } },
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$orderFinalCharge" },
                totalTax: { $sum: "$tax.totalTaxAmount" },
                totalDiscount: { $sum: "$discount.totalDiscountAmount" },
                totalOrders: { $sum: 1 }
            }
        }
    ]);

    const stats = summaryStats[0] || { totalSales: 0, totalTax: 0, totalDiscount: 0, totalOrders: 0 };

    const { jsPDF } = require("jspdf");
    require("jspdf-autotable");
    const doc = new jsPDF();

    // Add Content
    doc.setFontSize(22);
    doc.text(`Sales Report: ${restaurant?.name || 'Restaurant'}`, 14, 20);

    doc.setFontSize(12);
    doc.text(`Period: ${startDate || 'All Time'} to ${endDate || 'Present'}`, 14, 30);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 37);

    doc.autoTable({
        startY: 45,
        head: [['Metric', 'Value']],
        body: [
            ['Total Orders', stats.totalOrders],
            ['Total Gross Sales', `$${stats.totalSales.toFixed(2)}`],
            ['Total Tax Collected', `$${stats.totalTax.toFixed(2)}`],
            ['Total Discounts Applied', `$${stats.totalDiscount.toFixed(2)}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [41, 128, 185] }
    });

    // Set Response Headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report_${restaurantId}_${new Date().getTime()}.pdf`);

    // Output buffer
    const pdfOutput = doc.output('arraybuffer');
    res.send(Buffer.from(pdfOutput));
});

module.exports = {
    getDashboardStats,
    exportDashboardReport
};
