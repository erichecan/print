// Utility helper functions
const { v4: uuidv4 } = require('uuid');

/**
 * Generate UUID
 */
const generateId = () => {
  return uuidv4();
};

/**
 * Format response data
 */
const formatResponse = (data, message = 'Success', statusCode = 200) => {
  return {
    success: statusCode < 400,
    statusCode,
    message,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Format error response
 */
const formatError = (error, statusCode = 500) => {
  return {
    success: false,
    statusCode,
    error: error.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString()
  };
};

/**
 * Pagination helper
 */
const paginate = (page = 1, limit = 20) => {
  const offset = (page - 1) * limit;
  return {
    offset: Math.max(0, offset),
    limit: Math.min(100, Math.max(1, limit)),
    page: Math.max(1, page)
  };
};

/**
 * Calculate order totals
 */
const calculateTotals = (items, shipping = 0, taxRate = 0.08) => {
  const subtotal = items.reduce((sum, item) => {
    return sum + item.price * item.quantity;
  }, 0);

  const tax = subtotal * taxRate;
  const total = subtotal + shipping + tax;

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    shipping: Math.round(shipping * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100
  };
};

/**
 * Validate email
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Sanitize input
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
};

module.exports = {
  generateId,
  formatResponse,
  formatError,
  paginate,
  calculateTotals,
  isValidEmail,
  sanitizeInput
};

