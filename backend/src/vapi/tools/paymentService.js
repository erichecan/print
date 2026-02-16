const Stripe = require('stripe');
const logger = require('../../utils/logger');

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY ? Stripe(process.env.STRIPE_SECRET_KEY) : null;

/**
 * Generate a Stripe Payment Link for an order
 * @param {string} orderCode - The order code
 * @param {number} amount - Total amount in standard units (e.g., 25.00)
 * @param {string} currency - Currency code (default 'cad')
 * @returns {Promise<string>} - The payment URL
 */
exports.generatePaymentLink = async (orderCode, amount, currency = 'cad') => {
    try {
        if (!stripe) {
            logger.warn('[Vapi] Stripe key missing, returning mock link');
            return `https://mock-payment.com/pay/${orderCode}`;
        }

        logger.info(`[Vapi] Generating payment link for order ${orderCode} ($${amount})`);

        // 1. Create a Product for this specific order
        const product = await stripe.products.create({
            name: `Order Payment: ${orderCode}`,
        });

        // 2. Create a Price for this product
        const price = await stripe.prices.create({
            currency: currency.toLowerCase(),
            unit_amount: Math.round(amount * 100), // Convert to cents
            product: product.id,
        });

        // 3. Create Payment Link
        const paymentLink = await stripe.paymentLinks.create({
            line_items: [
                {
                    price: price.id,
                    quantity: 1,
                },
            ],
            metadata: {
                orderCode: orderCode,
            },
        });

        return paymentLink.url;

    } catch (error) {
        logger.error('[Vapi] Error generating payment link:', error);
        // Fallback to mock link in dev/error case
        return `https://fallback-payment.com/pay/${orderCode}`;
    }
};

/**
 * Send the payment link to the customer
 * @param {string} link - The payment URL
 * @param {string} method - 'sms' or 'email'
 * @param {string} destination - Phone number or Email
 * @returns {Promise<boolean>}
 */
exports.sendPaymentLink = async (link, method, destination) => {
    // Mock sending for MVP
    logger.info('---------------------------------------------------');
    logger.info(`[Vapi] MOCK SENDING PAYMENT LINK via ${method}`);
    logger.info(`To: ${destination}`);
    logger.info(`Message: Please pay for your order here: ${link}`);
    logger.info('---------------------------------------------------');
    return true;
};
