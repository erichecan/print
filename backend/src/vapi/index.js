const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const productService = require('./tools/productService');
const orderService = require('./tools/orderService');
const pricingService = require('./tools/pricingService');
const paymentService = require('./tools/paymentService');

// Middleware to log Vapi requests
router.use((req, res, next) => {
    logger.info(`[Vapi API] ${req.method} ${req.path}`);
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

module.exports = router;
