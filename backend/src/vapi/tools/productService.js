const prisma = require('../../lib/prisma');
const logger = require('../../utils/logger');
const { Op } = require('sequelize'); // Not used with Prisma, but good to keep in mind if we were using Sequelize.

// Hardcoded aliases for common speech terms
const PRODUCT_ALIASES = {
    'hoodie': ['Hoodies', 'Gildan Heavy Blend Hoodie'],
    't-shirt': ['Short Sleeve T-shirts', 'Gildan Softstyle Jersey T-shirt'],
    'tee': ['Short Sleeve T-shirts', 'Gildan Softstyle Jersey T-shirt'],
    'long sleeve': ['Long Sleeve T-shirts'],
    'sweatshirt': ['Crewneck Sweatshirts'],
    'polo': ['Performance Polo'], // Example, might need adjustment based on real data
};

/**
 * Recommend products based on a search query
 * @param {string} query - The search term (e.g., "hoodie", "black tee")
 * @returns {Promise<Array>} - List of recommended products
 */
exports.recommendProduct = async (query) => {
    try {
        const normalizedQuery = query.toLowerCase().trim();
        logger.info(`[Vapi] Recommending products for query: "${normalizedQuery}"`);

        let searchTerms = [normalizedQuery];

        // Check aliases
        for (const [key, values] of Object.entries(PRODUCT_ALIASES)) {
            if (normalizedQuery.includes(key)) {
                searchTerms = [...searchTerms, ...values];
            }
        }

        // Perform search in DB
        // We'll search for products where the name contains any of the search terms
        // or the simplified alias terms.

        let products = [];
        try {
            const whereConditions = searchTerms.map(term => ({
                name: {
                    contains: term,
                    mode: 'insensitive',
                },
                is_active: true,
            }));

            products = await prisma.offline_order_products.findMany({
                where: {
                    OR: whereConditions,
                },
                take: 5, // Limit to 5 results
                orderBy: {
                    display_order: 'asc',
                },
                select: {
                    id: true,
                    name: true,
                    image_url: true,
                },
            });
        } catch (dbError) {
            logger.warn('[Vapi] Failed to search products in DB, using fallback:', dbError.message);
            // Fallback: If DB fails, return some generic products matching query roughly
            if (normalizedQuery.includes('hoodie')) {
                products = [{ id: 'fallback-hoodie', name: 'Gildan Heavy Blend Hoodie' }];
            } else if (normalizedQuery.includes('t-shirt') || normalizedQuery.includes('tee')) {
                products = [{ id: 'fallback-tee', name: 'Gildan Softstyle T-Shirt' }];
            }
        }

        // Post-process to simplify names for speech
        const simplifiedProducts = products.map(p => ({
            id: p.id,
            originalName: p.name,
            // Simple logic to shorten names for TTS: remove everything after " T-shirt" or similar if too long
            spokenName: p.name.replace(/ T-shirt| Sweatshirt/gi, '').trim(),
        }));

        return simplifiedProducts;

    } catch (error) {
        console.error('CRITICAL VAPI ERROR:', error); // Explicit console log
        logger.error('[Vapi] Error recommending products:', error);
        throw new Error('Failed to recommend products');
    }
};
