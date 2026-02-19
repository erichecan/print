const logger = require('../../utils/logger');

/**
 * Sales Router
 * 
 * Analyzes user message and context to determine the user's intent
 * and recommends the next best tool to call.
 * 
 * @param {string} userMessage - The latest message from the user.
 * @param {string} conversationContext - Summary or recent history of the conversation (optional).
 * @returns {object} - { intent, recommendedTool, missingFields, confidence, notes }
 */
exports.routeRequest = async (userMessage, conversationContext = '') => {
    logger.info('[SalesRouter] Analyzing request:', { userMessage, contextLen: conversationContext.length });

    const msg = userMessage.toLowerCase();

    // Default response (Unknown)
    let response = {
        intent: 'UNKNOWN',
        recommendedTool: null,
        missingFields: [],
        confidence: 0.0,
        notes: "Could not determine clear intent. Ask clarifying questions."
    };

    // 1. Check Order Status
    // Keywords: status, where is my order, track, off-xxx
    if (msg.includes('status') || msg.includes('track') || msg.includes('where is my order') || msg.match(/off-\d+/)) {
        response = {
            intent: 'CHECK_ORDER',
            recommendedTool: 'check_order_status',
            missingFields: [], // Tool will prompt for orderCode if missing
            confidence: 0.9,
            notes: "User wants to check order status."
        };

        // Check if order code is present in message
        if (!msg.match(/off-\d+/i)) {
            response.missingFields.push('orderCode');
        }
    }

    // 2. Pricing / Quote
    // Keywords: how much, price, cost, quote, estimate
    else if (msg.includes('how much') || msg.includes('price') || msg.includes('cost') || msg.includes('quote')) {
        response = {
            intent: 'QUOTE',
            recommendedTool: 'calculate_price', // or 'get_quote_and_policy' if that's the preferred name
            missingFields: [],
            confidence: 0.85,
            notes: "User is asking for pricing."
        };

        // simplistic check for missing fields
        if (!msg.includes('shirt') && !msg.includes('hoodie')) response.missingFields.push('item_type');
        if (!msg.match(/\d+/)) response.missingFields.push('quantity');
    }

    // 3. Create Order / Buy
    // Keywords: buy, order, place an order, checkout, purchase
    // Distinguish from "how do I order" (informational) vs "I want to buy" (action)
    else if (msg.includes('create order') || msg.includes('place an order') || msg.includes('buy now') || (msg.includes('order') && msg.includes('ready')) || msg.includes('want to buy') || msg.includes('like to buy')) {
        response = {
            intent: 'CREATE_ORDER',
            recommendedTool: 'create_order',
            missingFields: [],
            confidence: 0.8,
            notes: "User wants to finalize an order."
        };

        // Critical fields for creating order
        if (!msg.includes('@') && !conversationContext.includes('email')) response.missingFields.push('email');
        if (!msg.match(/\d+/) && !conversationContext.match(/\d+/)) response.missingFields.push('quantity');
    }

    // 4. Product Recommendation / Discovery
    // Keywords: looking for, suggest, recommend, what kind of, do you have
    else if (msg.includes('looking for') || msg.includes('recommend') || msg.includes('do you have') || msg.includes('i want a')) {
        response = {
            intent: 'RECOMMEND_PRODUCT',
            recommendedTool: 'recommend_product',
            missingFields: [],
            confidence: 0.8,
            notes: "User is searching for products."
        };

        if (!msg.includes('hoodie') && !msg.includes('shirt') && !msg.includes('sleeve')) {
            response.missingFields.push('product_type');
        }
    }

    logger.info('[SalesRouter] Routing result:', response);
    return response;
};
