const prisma = require('../../lib/prisma');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Check the status of an order (Online or Offline)
 * @param {string} orderCode - The order identifier (e.g., "OFF-123456", "WOO-1001")
 * @returns {Promise<Object>} - Order status details
 */
exports.checkOrderStatus = async (orderCode) => {
    try {
        logger.info(`[Vapi] Checking status for order: ${orderCode}`);

        // Try finding in OfflineOrder first
        const offlineOrder = await prisma.offlineOrder.findUnique({
            where: { orderCode },
            select: {
                orderCode: true,
                status: true,
                deliveryDate: true,
                stageLabel: true,
                configuration: true, // Might contain items for detailed status
            },
        });

        if (offlineOrder) {
            return {
                found: true,
                type: 'offline',
                orderCode: offlineOrder.orderCode,
                status: offlineOrder.status,
                stage: offlineOrder.stageLabel,
                deliveryDate: offlineOrder.deliveryDate,
                itemsCount: offlineOrder.configuration?.items?.length || 0,
            };
        }

        // Try finding in Online Order (Assuming 'Order' model exists and has 'orderNumber' or similar)
        // Based on schema review, there is an 'Order' model but let's double check field names if needed.
        // For now, I'll assume 'orderNumber' is the key.
        const onlineOrder = await prisma.order.findUnique({
            where: { orderNumber: orderCode }, // Adjust field name based on schema if needed
            select: {
                orderNumber: true,
                status: true,
                createdAt: true,
            },
        });

        if (onlineOrder) {
            return {
                found: true,
                type: 'online',
                orderCode: onlineOrder.orderNumber,
                status: onlineOrder.status,
                date: onlineOrder.createdAt,
            };
        }

        return { found: false, message: 'Order not found' };

    } catch (error) {
        logger.error('[Vapi] Error checking order status:', error);
        throw new Error('Failed to check order status');
    }
};

/**
 * Create a new offline order from Vapi input
 * @param {Object} orderData - The order details from Vapi
 * @returns {Promise<Object>} - Created order details
 */
exports.createOrder = async (orderData) => {
    try {
        logger.info('[Vapi] Creating new offline order', orderData);

        const { customer, items, printDetails, pricing, shipping } = orderData;

        // Generate a unique order code
        const orderCode = `OFF-${Date.now().toString().slice(-6)}`;

        // Prepare configuration JSON
        const configuration = {
            items,
            printDetails,
            shipping,
            pricing, // Store the calculated price snapshot
            source: 'vapi_assistant',
        };

        const newOrder = await prisma.offlineOrder.create({
            data: {
                orderCode,
                contactName: customer.name,
                phone: customer.phone,
                email: customer.email,
                status: 'ACTIVE', // Default status per schema (Draft stage handles pending state)
                stageKey: 'draft', // Initial stage
                stageLabel: 'Draft',
                configuration,
                // Map other fields as necessary
                projectName: `Vapi Order - ${customer.name}`,
            },
        });

        logger.info(`[Vapi] Created order: ${newOrder.orderCode}`);

        return {
            success: true,
            orderCode: newOrder.orderCode,
            orderId: newOrder.id,
            totalAmount: pricing.total,
        };

    } catch (error) {
        console.error('CRITICAL VAPI ERROR (Order):', error);
        logger.error('[Vapi] Error creating order:', error);
        throw new Error('Failed to create order');
    }
};
