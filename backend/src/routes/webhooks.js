/**
 * Webhook Routes
 */
const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/webhookController');

// Stripe webhook - raw body is already parsed by app.js middleware
router.post('/stripe', handleStripeWebhook);

module.exports = router;
