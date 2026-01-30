/**
 * Shipping Engine
 * Responsible for matching shipping templates and rules against order info
 */

const prisma = require('../lib/prisma');

/**
 * Calculate shipping based on database templates and rules
 * 
 * @param {Object} params
 * @param {string} params.country - ISO country code (e.g., 'CA', 'US')
 * @param {string} params.province - Province/state code (e.g., 'ON', 'QC')
 * @param {string} params.postalCode - Postal/Zip code
 * @param {number} params.orderAmount - Total order amount before shipping/tax
 * @param {number} params.orderWeight - Total order weight in kg
 * @param {Array<string>} params.productIds - Array of product IDs in the cart
 * @param {string} params.shippingMethod - Requested method ('standard', 'express', etc.)
 * @returns {Promise<Object>} - Matched rule info or null
 */
async function calculateShippingFromDb({
    country,
    province,
    postalCode,
    orderAmount,
    orderWeight = 0,
    productIds = [],
    shippingMethod = 'standard'
}) {
    const now = new Date();

    // 1. Fetch all active templates that are within valid date range
    // Order by priority (higher first)
    const templates = await prisma.shippingTemplate.findMany({
        where: {
            isActive: true,
            OR: [
                { startDate: null, endDate: null },
                {
                    AND: [
                        { startDate: { lte: now } },
                        { endDate: { gte: now } }
                    ]
                },
                { startDate: { lte: now }, endDate: null },
                { startDate: null, endDate: { gte: now } }
            ]
        },
        include: {
            rules: {
                where: {
                    shippingMethod: shippingMethod
                }
            },
            products: {
                select: {
                    productId: true
                }
            }
        },
        orderBy: {
            priority: 'desc'
        }
    });

    if (templates.length === 0) {
        return null;
    }

    // 2. Separate templates into product-specific and general templates
    const productSpecificTemplates = templates.filter(t => t.products.length > 0);
    const generalTemplates = templates.filter(t => t.products.length === 0);

    // 3. Try to match product-specific templates first (highest priority if products match)
    // Logic: If the cart contains ANY product associated with a template, that template's rules apply
    if (productIds.length > 0) {
        for (const template of productSpecificTemplates) {
            const templateProductIds = template.products.map(tp => tp.productId);
            const hasMatchingProduct = productIds.some(pid => templateProductIds.includes(pid));

            if (hasMatchingProduct) {
                const rule = findMatchingRule(template.rules, {
                    country,
                    province,
                    postalCode,
                    orderAmount,
                    orderWeight
                });

                if (rule) {
                    return {
                        templateId: template.id,
                        templateName: template.name,
                        ruleId: rule.id,
                        cost: Number(rule.cost),
                        estimatedDays: rule.estimatedDays,
                        isFreeShipping: rule.isFreeShipping
                    };
                }
            }
        }
    }

    // 4. Try to match general templates
    for (const template of generalTemplates) {
        const rule = findMatchingRule(template.rules, {
            country,
            province,
            postalCode,
            orderAmount,
            orderWeight
        });

        if (rule) {
            return {
                templateId: template.id,
                templateName: template.name,
                ruleId: rule.id,
                cost: Number(rule.cost),
                estimatedDays: rule.estimatedDays,
                isFreeShipping: rule.isFreeShipping
            };
        }
    }

    return null;
}

/**
 * Find the best matching rule within a template
 */
function findMatchingRule(rules, { country, province, postalCode, orderAmount, orderWeight }) {
    if (!rules || rules.length === 0) return null;

    // Score each rule based on how many conditions match
    const scoredRules = rules.map(rule => {
        let score = 0;

        // Country match (Mandatory if specified)
        if (rule.country && rule.country !== 'ALL') {
            if (rule.country.toUpperCase() !== country?.toUpperCase()) {
                return { rule, score: -1 };
            }
            score += 10;
        } else {
            score += 5; // 'ALL' or null
        }

        // Province match
        if (rule.provinces && rule.provinces.length > 0) {
            if (!rule.provinces.includes(province?.toUpperCase())) {
                return { rule, score: -1 };
            }
            score += 20;
        }

        // Postal Code match (using simple startswith for now)
        if (rule.postalCodePattern) {
            const pattern = rule.postalCodePattern.replace('*', '');
            if (!postalCode?.toUpperCase().startsWith(pattern.toUpperCase())) {
                return { rule, score: -1 };
            }
            score += 30;
        }

        // Order Amount match
        if (rule.minOrderAmount !== null) {
            if (orderAmount < Number(rule.minOrderAmount)) {
                return { rule, score: -1 };
            }
            score += 10;
        }
        if (rule.maxOrderAmount !== null) {
            if (orderAmount > Number(rule.maxOrderAmount)) {
                return { rule, score: -1 };
            }
            score += 10;
        }

        // Weight match
        if (rule.minWeight !== null) {
            if (orderWeight < Number(rule.minWeight)) {
                return { rule, score: -1 };
            }
            score += 5;
        }
        if (rule.maxWeight !== null) {
            if (orderWeight > Number(rule.maxWeight)) {
                return { rule, score: -1 };
            }
            score += 5;
        }

        return { rule, score };
    });

    // Filter out non-matching rules and sort by score descending
    const matchingRules = scoredRules
        .filter(sr => sr.score >= 0)
        .sort((a, b) => b.score - a.score);

    return matchingRules.length > 0 ? matchingRules[0].rule : null;
}

module.exports = {
    calculateShippingFromDb
};
