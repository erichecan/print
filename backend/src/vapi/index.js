const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const productService = require('./tools/productService');
const orderService = require('./tools/orderService');
const pricingService = require('./tools/pricingService');
const paymentService = require('./tools/paymentService');
const quoteService = require('./tools/quoteService');


// Middleware to log Vapi requests and normalize payload
router.use((req, res, next) => {
    logger.info(`[Vapi API] ${req.method} ${req.path}`);

    // Log incoming body for debugging
    if (req.method === 'POST') {
        logger.info('[Vapi Payload Raw]', JSON.stringify(req.body));
    }

    // Normalize Vapi Payload
    // Vapi sometimes sends: { message: { toolCalls: [...] } } or { function: { arguments: ... } }
    // We want to flatten it so req.body contains the actual arguments.

    if (req.body && typeof req.body === 'object') {
        // Case 1: Vapi "Server URL" payload (contains 'message')
        if (req.body.message && req.body.message.toolCalls) {
            const toolCall = req.body.message.toolCalls[0];
            if (toolCall && toolCall.function && toolCall.function.arguments) {
                try {
                    const args = typeof toolCall.function.arguments === 'string'
                        ? JSON.parse(toolCall.function.arguments)
                        : toolCall.function.arguments;
                    req.body = { ...req.body, ...args };
                    logger.info('[Vapi Payload Normalized] Extracted from message.toolCalls', args);
                } catch (e) {
                    logger.error('[Vapi] Failed to parse tool arguments from message.toolCalls', e);
                }
            }
        }
        // Case 2: Vapi "Function" payload (direct tool call)
        else if (req.body.function && req.body.function.arguments) {
            try {
                const args = typeof req.body.function.arguments === 'string'
                    ? JSON.parse(req.body.function.arguments)
                    : req.body.function.arguments;
                req.body = { ...req.body, ...args };
                logger.info('[Vapi Payload Normalized] Extracted from function.arguments', args);
            } catch (e) {
                logger.error('[Vapi] Failed to parse tool arguments from function.arguments', e);
            }
        }
    }

    next();
});

/**
 * 1. Recommend Products
 * POST /api/vapi/tools/recommend
 * Body: { query: "hoodie" }
 */
router.post('/tools/product/recommend', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) return res.status(400).json({ error: 'Query is required' });

        const products = await productService.recommendProduct(query);
        res.json({ products });
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 2. Check Order Status
 * POST /api/vapi/tools/order/status
 * Body: { orderCode: "OFF-123" }
 */
router.post('/tools/order/status', async (req, res) => {
    try {
        const { orderCode } = req.body;
        if (!orderCode) return res.status(400).json({ error: 'Order code is required' });

        const status = await orderService.checkOrderStatus(orderCode);
        res.json(status);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 3. Calculate Price
 * POST /api/vapi/tools/pricing/calculate
 * Body: { items: [], printDetails: [], isRush: false }
 */
router.post('/tools/pricing/calculate', async (req, res) => {
    try {
        const { items, printDetails, isRush } = req.body;
        const pricing = await pricingService.getPricing(items || [], printDetails || [], isRush || false);
        res.json(pricing);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 4. Create Order
 * POST /api/vapi/tools/order/create
 * Body: { customer, items, printDetails, pricing, shipping }
 */
router.post('/tools/order/create', async (req, res) => {
    try {
        const orderData = req.body;
        const result = await orderService.createOrder(orderData);
        res.json(result);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 5. Send Payment Link
 * POST /api/vapi/tools/payment/link
 * Body: { orderCode: "OFF-123", amount: 25.00, method: "sms", destination: "+1234567890" }
 */
router.post('/tools/payment/link', async (req, res) => {
    try {
        const { orderCode, amount, method, destination } = req.body;

        // 1. Generate Link
        const link = await paymentService.generatePaymentLink(orderCode, amount);

        // 2. Send it
        const sent = await paymentService.sendPaymentLink(link, method, destination);

        res.json({ success: sent, link }); // Return link to Vapi too, just in case
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 6. Get Quote and Policy
 * POST /api/vapi/tools/quote_and_policy
 * Body: { items, printDetails, isRush, address }
 */
router.post('/tools/quote_and_policy', async (req, res) => {
    try {
        const { items, printDetails, isRush, address } = req.body;
        const result = await quoteService.getQuoteAndPolicy({ items, printDetails, isRush, address });
        res.json(result);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 7. List Orders (Search)
 * POST /api/vapi/tools/order/list
 * Body: { customerName, email, phone, limit }
 */
router.post('/tools/order/list', async (req, res) => {
    try {
        const { customerName, email, phone, limit } = req.body;
        const results = await orderService.listOrders({ customerName, email, phone, limit });
        res.json(results);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * 8. Update Order
 * POST /api/vapi/tools/order/update
 * Body: { orderCode, status, notes }
 */
router.post('/tools/order/update', async (req, res) => {
    try {
        const { orderCode, status, notes } = req.body;
        if (!orderCode) return res.status(400).json({ error: 'Order code is required' });

        const result = await orderService.updateOrder(orderCode, { status, notes });
        res.json(result);
    } catch (error) {
        logger.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
