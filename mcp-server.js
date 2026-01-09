// const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
// const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
// const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
// const dotenv = require("dotenv");
// const path = require("path");

// // Load environment variables from .env file
// dotenv.config();

// // Redirect all console.log to console.error.
// // MCP stdio transport uses stdout for communication.
// // Any other output to stdout will corrupt the protocol.
// console.log = console.error;

// const { connectToDatabase } = require("./config/db");
// const {
//     getOrderModel,
//     getItemModel,
//     getRestaurantModel,
//     getCategoryModel
// } = require("./models/index");
// const { ORDER_STATUS } = require("./utils/const");

// // Initialize the MCP Server
// const server = new Server(
//     {
//         name: "food-ordering-mcp-server",
//         version: "1.0.0",
//     },
//     {
//         capabilities: {
//             tools: {},
//         },
//     }
// );

// /**
//  * List available tools to the AI
//  */
// server.setRequestHandler(ListToolsRequestSchema, async () => {
//     return {
//         tools: [
//             {
//                 name: "get_active_orders",
//                 description: "List all orders that are currently pending, confirmed, or being prepared.",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         restaurantId: { type: "string", description: "The restaurant identifier (e.g., '123')" }
//                     },
//                     required: ["restaurantId"]
//                 },
//             },
//             {
//                 name: "get_tables_status",
//                 description: "Identify which tables are available, occupied, or have ongoing orders.",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         restaurantId: { type: "string", description: "The restaurant identifier" }
//                     },
//                     required: ["restaurantId"]
//                 },
//             },
//             {
//                 name: "update_item_price",
//                 description: "Change the price of a menu item.",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         restaurantId: { type: "string", description: "The restaurant identifier" },
//                         itemId: { type: "string", description: "The MongoDB ID of the item" },
//                         newPrice: { type: "number", description: "The new price for the item" }
//                     },
//                     required: ["restaurantId", "itemId", "newPrice"]
//                 },
//             },
//             {
//                 name: "get_dashboard_stats",
//                 description: "Get revenue, order counts, and top-selling items for a specific date range.",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         restaurantId: { type: "string", description: "The restaurant identifier" },
//                         startDate: { type: "string", description: "Start date (YYYY-MM-DD)" },
//                         endDate: { type: "string", description: "End date (YYYY-MM-DD)" }
//                     },
//                     required: ["restaurantId"]
//                 },
//             },
//             {
//                 name: "reset_table",
//                 description: "Clear an ongoing order from a table and make it available. Useful for walk-outs or manual corrections.",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         restaurantId: { type: "string", description: "The restaurant identifier" },
//                         tableNumber: { type: "string", description: "The table number to reset" }
//                     },
//                     required: ["restaurantId", "tableNumber"]
//                 },
//             },
//             {
//                 name: "update_kds_item_status",
//                 description: "Update the status of an item in the Kitchen Display System (e.g., set to 'prepared' or 'ready').",
//                 inputSchema: {
//                     type: "object",
//                     properties: {
//                         restaurantId: { type: "string", description: "The restaurant identifier" },
//                         orderId: { type: "string", description: "The order ID" },
//                         itemId: { type: "string", description: "The internal item ID (from orderItems array)" },
//                         status: { type: "string", enum: ["new", "started", "prepared", "ready"], description: "The new status" }
//                     },
//                     required: ["restaurantId", "orderId", "itemId", "status"]
//                 },
//             }
//         ],
//     };
// });

// /**
//  * Handle tool execution
//  */
// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//     const { name, arguments: args } = request.params;

//     try {
//         const db = await connectToDatabase(args.restaurantId);

//         switch (name) {
//             case "get_active_orders": {
//                 const Order = getOrderModel(db);
//                 const activeOrders = await Order.find({
//                     orderStatus: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY] }
//                 }).sort({ createdAt: -1 });

//                 return {
//                     content: [{ type: "text", text: JSON.stringify(activeOrders, null, 2) }],
//                 };
//             }

//             case "get_tables_status": {
//                 const Restaurant = getRestaurantModel(db);
//                 const Order = getOrderModel(db);

//                 const restaurantDoc = await Restaurant.findOne({});
//                 if (!restaurantDoc) throw new Error("Restaurant configuration not found");

//                 const totalTables = restaurantDoc.tableConfiguration?.totalTables || 0;
//                 const activeOrders = await Order.find({
//                     orderStatus: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.SERVED] },
//                     tableNumber: { $exists: true, $ne: null }
//                 });

//                 const activeOrdersMap = {};
//                 activeOrders.forEach(o => activeOrdersMap[o.tableNumber] = o);

//                 const tables = [];
//                 for (let i = 1; i <= totalTables; i++) {
//                     const tableNum = i.toString();
//                     const order = activeOrdersMap[tableNum];
//                     tables.push({
//                         tableNumber: tableNum,
//                         status: order ? "occupied/ongoing" : "available",
//                         orderId: order ? order._id : null,
//                         amount: order ? order.orderFinalCharge : 0,
//                         customer: order ? order.contactName || order.serverName : null
//                     });
//                 }

//                 return {
//                     content: [{ type: "text", text: JSON.stringify({ totalTables, tables }, null, 2) }],
//                 };
//             }

//             case "update_item_price": {
//                 const Item = getItemModel(db);
//                 const updatedItem = await Item.findByIdAndUpdate(
//                     args.itemId,
//                     { price: args.newPrice },
//                     { new: true }
//                 );

//                 if (!updatedItem) throw new Error("Item not found");

//                 return {
//                     content: [{ type: "text", text: `Price updated for ${updatedItem.name} to ${updatedItem.price}` }],
//                 };
//             }

//             case "get_dashboard_stats": {
//                 const Order = getOrderModel(db);
//                 const dateFilter = {};
//                 if (args.startDate || args.endDate) {
//                     dateFilter.createdAt = {};
//                     if (args.startDate) dateFilter.createdAt.$gte = new Date(args.startDate);
//                     if (args.endDate) {
//                         const end = new Date(args.endDate);
//                         end.setHours(23, 59, 59, 999);
//                         dateFilter.createdAt.$lte = end;
//                     }
//                 }

//                 const stats = await Order.aggregate([
//                     { $match: { ...dateFilter, orderStatus: { $ne: ORDER_STATUS.CANCELED } } },
//                     {
//                         $group: {
//                             _id: null,
//                             totalRevenue: { $sum: "$orderFinalCharge" },
//                             orderCount: { $sum: 1 },
//                             avgOrderValue: { $avg: "$orderFinalCharge" }
//                         }
//                     }
//                 ]);

//                 const topItems = await Order.aggregate([
//                     { $match: { ...dateFilter, orderStatus: { $ne: ORDER_STATUS.CANCELED } } },
//                     { $unwind: "$orderItems" },
//                     {
//                         $group: {
//                             _id: "$orderItems.item",
//                             quantity: { $sum: "$orderItems.quantity" },
//                             revenue: { $sum: { $multiply: ["$orderItems.price", "$orderItems.quantity"] } }
//                         }
//                     },
//                     { $sort: { quantity: -1 } },
//                     { $limit: 5 }
//                 ]);

//                 return {
//                     content: [{ type: "text", text: JSON.stringify({ summary: stats[0] || {}, topItems }, null, 2) }],
//                 };
//             }

//             case "reset_table": {
//                 const Order = getOrderModel(db);
//                 // Force complete/cancel any open orders for this table
//                 const result = await Order.updateMany(
//                     {
//                         tableNumber: args.tableNumber,
//                         orderStatus: { $in: [ORDER_STATUS.PENDING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PREPARING, ORDER_STATUS.READY, ORDER_STATUS.SERVED] }
//                     },
//                     { orderStatus: ORDER_STATUS.CANCELED }
//                 );

//                 return {
//                     content: [{ type: "text", text: `Table ${args.tableNumber} reset. ${result.modifiedCount} order(s) canceled.` }],
//                 };
//             }

//             case "update_kds_item_status": {
//                 const Order = getOrderModel(db);
//                 const order = await Order.findById(args.orderId);
//                 if (!order) throw new Error("Order not found");

//                 const orderItem = order.orderItems.id(args.itemId);
//                 if (!orderItem) throw new Error("Item not found in order");

//                 orderItem.itemStatus = args.status;

//                 // Update timestamps based on status
//                 const now = new Date();
//                 if (args.status === "started") orderItem.kdsTimestamps.startedAt = now;
//                 if (args.status === "prepared") orderItem.kdsTimestamps.preparedAt = now;
//                 if (args.status === "ready") orderItem.kdsTimestamps.readyAt = now;

//                 await order.save();

//                 return {
//                     content: [{ type: "text", text: `Item ${orderItem.item} status updated to ${args.status}` }],
//                 };
//             }

//             default:
//                 throw new Error(`Unknown tool: ${name}`);
//         }
//     } catch (error) {
//         return {
//             content: [{ type: "text", text: `Error: ${error.message}` }],
//             isError: true,
//         };
//     }
// });

// /**
//  * Start the server
//  */
// async function main() {
//     const transport = new StdioServerTransport();
//     await server.connect(transport);
//     console.error("Food Ordering MCP Server running on stdio");
// }

// main().catch((error) => {
//     console.error("Server error:", error);
//     process.exit(1);
// });
