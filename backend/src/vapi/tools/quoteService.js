const pricingService = require('./pricingService');
const logger = require('../../utils/logger');

// Policy Constants (Can be moved to DB or Config later)
const POLICY = {
    moq: 1, // Minimum Order Quantity
    leadTimeDays: {
        standard: 7,
        rush: 3,
    },
    rushCutoffTime: '14:00', // 2 PM
    shipping: {
        pickup: 'Free at 123 Print St.',
        standard: 'Calculated at checkout',
    },
    paymentMethods: ['Credit Card', 'E-transfer', 'Cash (Pickup)'],
};

// Quantity Breaks for Upselling
const QUANTITY_BREAKS = [
    { quantity: 12, discount: 0.05, label: '5% off' },
    { quantity: 24, discount: 0.10, label: '10% off' },
    { quantity: 50, discount: 0.15, label: '15% off' },
    { quantity: 100, discount: 0.20, label: '20% off' },
];

/**
 * Get a comprehensive quote and policy information
 * @param {Object} params
 * @param {Array} params.items - List of items { productId, quantity, size, color }
 * @param {Array} params.printDetails - List of prints { location, type }
 * @param {boolean} params.isRush - Whether this is a rush order
 * @param {string} params.address - Shipping address (optional, for lead time adjustment)
 * @returns {Promise<Object>} - Quote, policy, and upsell info
 */
exports.getQuoteAndPolicy = async ({ items, printDetails, isRush = false, address }) => {
    try {
        logger.info('[Vapi] Generating Quote & Policy', { itemCount: items?.length, isRush });

        // 1. Calculate Base Price using existing service
        const pricing = await pricingService.getPricing(items, printDetails, isRush);

        // 2. Determine Lead Time
        const today = new Date();
        const leadDays = isRush ? POLICY.leadTimeDays.rush : POLICY.leadTimeDays.standard;
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + leadDays);

        // Skip weekends for delivery date estimation (simplistic)
        if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1); // Sunday -> Monday
        if (targetDate.getDay() === 6) targetDate.setDate(targetDate.getDate() + 2); // Saturday -> Monday

        const estimatedDelivery = targetDate.toISOString().split('T')[0];

        // 3. Analyze Upsell Opportunities
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
        let upsellSuggestion = null;

        // Find the next quantity break
        const nextBreak = QUANTITY_BREAKS.find(b => b.quantity > totalQuantity);

        if (nextBreak) {
            const needed = nextBreak.quantity - totalQuantity;
            upsellSuggestion = {
                type: 'quantity_break',
                message: `Order ${needed} more to get ${nextBreak.label} discount!`,
                targetQuantity: nextBreak.quantity,
                savingsPotential: 'Calculated at checkout' // Complex to calc perfectly here without unit price per breakdown
            };
        } else if (!isRush) {
            upsellSuggestion = {
                type: 'rush_delivery',
                message: `Need it faster? We can do it in ${POLICY.leadTimeDays.rush} days for a rush fee.`,
                fee: 25.00 // Matches coding in pricingService
            };
        }

        // 4. Construct Response
        return {
            quote: {
                total: pricing.total,
                currency: pricing.currency,
                breakdown: {
                    itemTotal: pricing.itemTotal,
                    printCost: pricing.printCost,
                    rushFee: pricing.rushFee,
                    tax: pricing.tax,
                }
            },
            policy: {
                leadTimeDays: leadDays,
                estimatedDelivery: estimatedDelivery,
                moq: POLICY.moq,
                isRush: isRush,
            },
            upsell: upsellSuggestion,
            actions: {
                canOrder: true,
                requiredFields: ['items', 'customer'], // What's needed to proceed to create_order
            }
        };

    } catch (error) {
        logger.error('[Vapi] Error generating quote:', error);
        throw new Error('Failed to generate quote and policy');
    }
};
