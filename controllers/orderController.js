const Order = require('../models/order/Order');
const { validateRequest, schemas } = require('../middleware/validationMiddleware');
const { logger } = require('../middleware/loggingMiddleware');

// Create new order
exports.createOrder = async (req, res) => {
    try {
        const orderData = req.body;
        
        // Calculate total amount including customizations
        let totalAmount = 0;
        for (const item of orderData.items) {
            const menuItem = await MenuItem.findById(item.itemId);
            if (!menuItem) {
                return res.status(404).json({
                    status: 'error',
                    message: `Menu item not found with id: ${item.itemId}`
                });
            }
            
            let itemTotal = menuItem.price * item.quantity;
            
            // Calculate customization costs
            if (item.customizations) {
                for (const customization of item.customizations) {
                    const option = await CustomizationOption.findById(customization.optionId);
                    const choice = option.choices.find(c => c._id.toString() === customization.choiceId);
                    if (choice && choice.additionalPrice) {
                        itemTotal += choice.additionalPrice;
                    }
                }
            }
            
            totalAmount += itemTotal;
        }

        // Apply tax
        const taxRate = 0.10; // 10% tax (you might want to make this configurable)
        const taxAmount = totalAmount * taxRate;
        totalAmount += taxAmount;

        // Create the order
        const order = new Order({
            ...orderData,
            totalAmount,
            taxAmount,
            user: req.user._id // Assuming you have user info from auth middleware
        });

        await order.save();

        // Populate necessary fields
        await order.populate([
            { path: 'user', select: 'name email phone' },
            { path: 'restaurant', select: 'name address contactInfo' },
            { path: 'items.item', select: 'name price' }
        ]);

        res.status(201).json({
            status: 'success',
            data: {
                order
            }
        });
    } catch (error) {
        logger.error('Error creating order:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error creating order',
            error: error.message
        });
    }
};

// Get all orders for a user
exports.getUserOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .populate([
                { path: 'restaurant', select: 'name address' },
                { path: 'items.item', select: 'name price' }
            ]);

        res.status(200).json({
            status: 'success',
            results: orders.length,
            data: {
                orders
            }
        });
    } catch (error) {
        logger.error('Error fetching user orders:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching orders',
            error: error.message
        });
    }
};

// Get specific order details
exports.getOrderDetails = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .populate([
                { path: 'user', select: 'name email phone' },
                { path: 'restaurant', select: 'name address contactInfo' },
                { path: 'items.item', select: 'name price description' },
                { path: 'discountApplied' }
            ]);

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found'
            });
        }

        // Check if the user is authorized to view this order
        if (order.user._id.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                status: 'error',
                message: 'Not authorized to view this order'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                order
            }
        });
    } catch (error) {
        logger.error('Error fetching order details:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error fetching order details',
            error: error.message
        });
    }
};

// Update order status
exports.updateOrderStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found'
            });
        }

        // Add validation for status transitions
        const validTransitions = {
            PLACED: ['CONFIRMED', 'CANCELLED'],
            CONFIRMED: ['PREPARING', 'CANCELLED'],
            PREPARING: ['OUT_FOR_DELIVERY', 'CANCELLED'],
            OUT_FOR_DELIVERY: ['DELIVERED', 'CANCELLED'],
            DELIVERED: [],
            CANCELLED: []
        };

        if (!validTransitions[order.orderStatus].includes(status)) {
            return res.status(400).json({
                status: 'error',
                message: `Invalid status transition from ${order.orderStatus} to ${status}`
            });
        }

        order.orderStatus = status;
        if (status === 'DELIVERED') {
            order.actualDeliveryTime = new Date();
        }

        await order.save();

        res.status(200).json({
            status: 'success',
            data: {
                order
            }
        });
    } catch (error) {
        logger.error('Error updating order status:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error updating order status',
            error: error.message
        });
    }
};

// Cancel order
exports.cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId);

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found'
            });
        }

        // Check if order can be cancelled
        const cancellableStatuses = ['PLACED', 'CONFIRMED'];
        if (!cancellableStatuses.includes(order.orderStatus)) {
            return res.status(400).json({
                status: 'error',
                message: 'Order cannot be cancelled at this stage'
            });
        }

        order.orderStatus = 'CANCELLED';
        await order.save();

        res.status(200).json({
            status: 'success',
            message: 'Order cancelled successfully',
            data: {
                order
            }
        });
    } catch (error) {
        logger.error('Error cancelling order:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error cancelling order',
            error: error.message
        });
    }
};

// Track order
exports.trackOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.orderId)
            .select('orderStatus estimatedDeliveryTime actualDeliveryTime createdAt items restaurant')
            .populate('restaurant', 'name address contactInfo');

        if (!order) {
            return res.status(404).json({
                status: 'error',
                message: 'Order not found'
            });
        }

        res.status(200).json({
            status: 'success',
            data: {
                order,
                tracking: {
                    status: order.orderStatus,
                    estimatedDeliveryTime: order.estimatedDeliveryTime,
                    actualDeliveryTime: order.actualDeliveryTime,
                    orderPlacedAt: order.createdAt
                }
            }
        });
    } catch (error) {
        logger.error('Error tracking order:', error);
        res.status(500).json({
            status: 'error',
            message: 'Error tracking order',
            error: error.message
        });
    }
}; 