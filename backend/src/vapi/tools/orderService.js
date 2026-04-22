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
                status: '待确认订单', // 2026-04-20: status 从 enum 改为中文文本（系统预置选项）
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
        throw new Error(`Failed to create order: ${error.message}`);
    }
};

/**
 * List orders matching search criteria
 * @param {Object} params - Search filters
 * @param {string} params.customerName - Filter by contact name
 * @param {string} params.email - Filter by email
 * @param {string} params.phone - Filter by phone number
 * @param {number} params.limit - Max results (default 5)
 * @returns {Promise<Array>} - List of matching order summaries
 */
exports.listOrders = async ({ customerName, email, phone, limit = 5 }) => {
    try {
        logger.info('[Vapi] Listing orders with params:', { customerName, email, phone });

        const where = {};
        const conditions = [];

        if (customerName) {
            conditions.push({ contactName: { contains: customerName, mode: 'insensitive' } });
        }
        if (email) {
            conditions.push({ email: { contains: email, mode: 'insensitive' } });
        }
        if (phone) {
            conditions.push({ phone: { contains: phone } });
        }

        if (conditions.length > 0) {
            where.OR = conditions;
        }

        const orders = await prisma.offlineOrder.findMany({
            where,
            take: limit,
            orderBy: { createdAt: 'desc' },
            select: {
                orderCode: true,
                contactName: true,
                status: true,
                createdAt: true,
                configuration: true // To get total price roughly if stored
            }
        });

        return orders.map(o => ({
            orderCode: o.orderCode,
            customer: o.contactName,
            status: o.status,
            date: o.createdAt.toISOString().split('T')[0],
            total: o.configuration?.pricing?.total || 'N/A'
        }));

    } catch (error) {
        logger.error('[Vapi] Error listing orders:', error);
        throw new Error('Failed to list orders');
    }
};

/**
 * Update an existing order
 * @param {string} orderCode - The order to update
 * @param {Object} updates - Fields to update (status, notes)
 * @returns {Promise<Object>} - Updated order details
 */
exports.updateOrder = async (orderCode, { status, notes }) => {
    try {
        logger.info(`[Vapi] Updating order ${orderCode}`, { status, notes });

        const order = await prisma.offlineOrder.findUnique({ where: { orderCode } });
        if (!order) {
            throw new Error(`Order ${orderCode} not found`);
        }

        const data = {};
        if (status) data.status = status;

        // If notes provided, we might want to append or replace. 
        // For simple Vapi use, let's append to existing internal notes or specific Vapi notes field if it existed.
        // Schema check: OfflineOrder usually has 'notes' or we store in config.
        // Let's assume there is a 'notes' field or we check schema.
        // Re-checking schema via current knowledge: OfflineOrder has 'internalNotes'.
        if (notes) {
            data.internalNotes = order.internalNotes
                ? `${order.internalNotes}\n[Vapi]: ${notes}`
                : `[Vapi]: ${notes}`;
        }

        const updatedOrder = await prisma.offlineOrder.update({
            where: { orderCode },
            data,
            select: { orderCode: true, status: true, internalNotes: true }
        });

        return {
            success: true,
            orderCode: updatedOrder.orderCode,
            status: updatedOrder.status,
            notes: updatedOrder.internalNotes
        };

    } catch (error) {
        logger.error('[Vapi] Error updating order:', error);
        throw new Error('Failed to update order');
    }
};
