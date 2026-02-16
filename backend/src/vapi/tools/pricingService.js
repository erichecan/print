const prisma = require('../../lib/prisma');
const logger = require('../../utils/logger');

// MVP Hardcoded Pricing Rules
const PRICING_RULES = {
    basePrice: 15.00, // Default base price for any tee if not found
    printCost: {
        'Front': 5.00,
        'Back': 5.00,
        'Sleeve': 3.00,
        'Left Chest': 3.00,
    },
    rushFee: 25.00, // Fixed rush fee
    setupFee: 0.00, // No setup fee for digital/DTG in MVP
};

/**
 * Calculate the total price for an order
 * @param {Array} items - List of items { productId, color, size, quantity }
 * @param {Array} printDetails - List of prints { location, type }
 * @param {boolean} isRush - Whether this is a rush order
 * @returns {Promise<Object>} - Price breakdown and total
 */
exports.getPricing = async (items, printDetails, isRush = false) => {
    try {
        logger.info('[Vapi] Calculating price', { itemCount: items?.length, printCount: printDetails?.length, isRush });

        let itemTotal = 0;
        let sizeFeesTotal = 0;
        let printTotal = 0;

        // Fetch size fees from DB
        const sizeFees = await prisma.offline_order_size_fees.findMany({
            where: { is_active: true },
        });

        // Convert to map for easy lookup: { '2XL': 2.00, '3XL': 3.00 }
        const sizeFeeMap = sizeFees.reduce((acc, fee) => {
            acc[fee.size.toUpperCase()] = Number(fee.additional_fee);
            return acc;
        }, {});

        // Calculate Item Costs
        for (const item of items) {
            const quantity = item.quantity || 1;
            const base = PRICING_RULES.basePrice; // In future, fetch from Product.price

            // Size Fee
            const sizeUpper = item.size?.toUpperCase();
            const additional = sizeFeeMap[sizeUpper] || 0;

            itemTotal += (base * quantity);
            sizeFeesTotal += (additional * quantity);
        }

        // Calculate Print Costs
        // Rule: Print cost is per item. If you order 10 shirts with Front print, that's 10 * $5.
        const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);

        let singleItemPrintCost = 0;
        if (printDetails && Array.isArray(printDetails)) {
            for (const print of printDetails) {
                // Simple matching for now
                const locationCost = PRICING_RULES.printCost[print.location] || 5.00; // Default $5 if unknown location
                singleItemPrintCost += locationCost;
            }
        }
        printTotal = singleItemPrintCost * totalQuantity;

        // Rush Fee
        const rushFee = isRush ? PRICING_RULES.rushFee : 0;

        // Grand Total
        const subtotal = itemTotal + sizeFeesTotal + printTotal + rushFee;

        // Tax (Mock 13% HST for now, or 0 if not specified)
        const tax = subtotal * 0.13;
        const total = subtotal + tax;

        return {
            success: true,
            currency: 'CAD',
            itemTotal: Number(itemTotal.toFixed(2)),
            sizeFees: Number(sizeFeesTotal.toFixed(2)),
            printCost: Number(printTotal.toFixed(2)),
            rushFee: Number(rushFee.toFixed(2)),
            subtotal: Number(subtotal.toFixed(2)),
            tax: Number(tax.toFixed(2)),
            total: Number(total.toFixed(2)),
        };

    } catch (error) {
        logger.error('[Vapi] Error calculating price:', error);
        throw new Error('Failed to calculate price');
    }
};
