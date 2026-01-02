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

    // Date Filtering
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

    const matchStage = {
        restaurantId,
        orderStatus: { $ne: ORDER_STATUS.CANCELED }, // Exclude canceled from revenue stats (unless handled separately)
        ...dateFilter
    };

    // Run Main Aggregation (Success Stats)
    const reportPromise = Order.aggregate([
        { $match: matchStage },
        {
            $facet: {
                // 1. Financial KPI Summary
                "kpis": [
                    {
                        $group: {
                            _id: null,
                            grossSales: { $sum: "$orderFinalCharge" },
                            netSales: { $sum: "$subtotal" },
                            totalTax: { $sum: "$tax.totalTaxAmount" },
                            totalTips: { $sum: { $add: ["$restaurantTipCharge", "$deliveryTipCharge"] } },
                            totalDiscounts: { $sum: "$discount.totalDiscountAmount" },
                            totalRefunds: { $sum: "$refunds.remainingCharge" }, // Assuming this tracks refunded amount
                            orderCount: { $sum: 1 },
                            avgOrderValue: { $avg: "$orderFinalCharge" },
                            avgTip: { $avg: { $add: ["$restaurantTipCharge", "$deliveryTipCharge"] } }
                        }
                    }
                ],

                // 2. Sales Trend (Graph Data) - Group by Day
                "salesTrend": [
                    {
                        $group: {
                            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                            sales: { $sum: "$orderFinalCharge" },
                            orders: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } } // Sort by date ascending
                ],

                // 3. Payment Method Breakdown
                "paymentAnalysis": [
                    { $unwind: "$payment.history" },
                    {
                        $group: {
                            _id: "$payment.history.method",
                            volume: { $sum: "$payment.history.amount" },
                            count: { $sum: 1 }
                        }
                    }
                ],

                // 4. Order Type / Source Analysis
                "orderDistribution": [
                    {
                        $group: {
                            _id: {
                                source: "$source", // staff vs customer
                                type: "$isDeliveryOrder", // boolean
                                table: { $cond: [{ $ifNull: ["$tableNumber", false] }, "Dine-In", "Takeout"] }
                            },
                            count: { $sum: 1 },
                            revenue: { $sum: "$orderFinalCharge" }
                        }
                    }
                ],

                // 5. Product Performance (Top Items)
                "topItems": [
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
                    // Lookup item details
                    {
                        $lookup: {
                            from: "items",
                            localField: "_id",
                            foreignField: "_id",
                            as: "details"
                        }
                    },
                    { $unwind: "$details" },
                    {
                        $project: {
                            name: "$details.name",
                            quantitySold: 1,
                            revenue: 1
                        }
                    }
                ],

                // 6. Operational Efficiency
                "operations": [
                    {
                        $match: { orderStatus: ORDER_STATUS.COMPLETED }
                    },
                    {
                        $group: {
                            _id: null,
                            avgPrepTimeMinutes: {
                                $avg: {
                                    $divide: [
                                        { $subtract: ["$preparationEndTime", "$preparationStartTime"] },
                                        1000 * 60 // Convert ms to minutes
                                    ]
                                }
                            },
                        }
                    }
                ],

                // 7. Hourly Peak Analysis
                "hourlyTraffic": [
                    {
                        $project: { hour: { $hour: "$createdAt" } }
                    },
                    {
                        $group: { _id: "$hour", count: { $sum: 1 } }
                    },
                    { $sort: { _id: 1 } }
                ],

                // 8. Staff Performance (New)
                "staffPerformance": [
                    { $match: { serverName: { $exists: true, $ne: null } } },
                    {
                        $group: {
                            _id: "$serverName",
                            ordersHandled: { $sum: 1 },
                            totalSales: { $sum: "$orderFinalCharge" },
                            avgTip: { $avg: "$restaurantTipCharge" }
                        }
                    },
                    { $sort: { totalSales: -1 } }
                ],

                // 9. Top Customers (New)
                "topCustomers": [
                    { $match: { customerId: { $ne: null } } },
                    {
                        $group: {
                            _id: "$customerId",
                            totalSpent: { $sum: "$orderFinalCharge" },
                            visitCount: { $sum: 1 },
                            lastVisit: { $max: "$createdAt" }
                        }
                    },
                    { $sort: { totalSpent: -1 } },
                    { $limit: 5 },
                    {
                        $lookup: {
                            from: "users",
                            localField: "_id",
                            foreignField: "_id",
                            as: "user"
                        }
                    },
                    { $unwind: "$user" },
                    {
                        $project: {
                            name: "$user.name",
                            email: "$user.email",
                            totalSpent: 1,
                            visitCount: 1,
                            lastVisit: 1
                        }
                    }
                ]
            }
        }
    ]);

    // 2. Parallel Aggregation for CANCELED orders (Lost Revenue)
    // We do this separately because the main pipeline excludes CANCELED orders to sanitize revenue figures
    const lostRevenuePromise = Order.aggregate([
        {
            $match: {
                restaurantId,
                orderStatus: ORDER_STATUS.CANCELED,
                ...dateFilter
            }
        },
        {
            $group: {
                _id: null,
                lostRevenue: { $sum: "$orderFinalCharge" }, // Potential revenue lost
                count: { $sum: 1 }
            }
        }
    ]);

    // Execute in parallel
    const [reportData, lostRevenueData] = await Promise.all([reportPromise, lostRevenuePromise]);
    const result = reportData[0];
    const lostStats = lostRevenueData[0] || { lostRevenue: 0, count: 0 };

    // Format Response
    res.status(HTTP_STATUS.OK).json({
        status: "success",
        data: {
            summary: {
                ...(result.kpis[0] || { grossSales: 0, orderCount: 0 }),
                lostRevenue: lostStats.lostRevenue,
                canceledOrders: lostStats.count
            },
            salesChart: result.salesTrend,
            topItems: result.topItems,
            paymentStats: result.paymentAnalysis,
            staffPerformance: result.staffPerformance,
            topCustomers: result.topCustomers,
            distribution: result.orderDistribution.map(d => ({
                source: d._id.source,
                isDelivery: d._id.type,
                type: d._id.table,
                count: d.count,
                revenue: d.revenue
            })),
            operations: result.operations[0] || { avgPrepTimeMinutes: 0 },
            peakHours: result.hourlyTraffic,
            metadata: {
                period: { startDate, endDate },
                generatedAt: new Date()
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
