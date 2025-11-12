/**
 * Validation Middleware
 * [2025-01-27 11:15:00] Express-validator wrapper for unified validation
 */
const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Middleware to check validation results
 * [2025-01-27 11:15:00]
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorDetails = {};
    errors.array().forEach((error) => {
      const field = error.param || error.path || 'unknown';
      if (!errorDetails[field]) {
        errorDetails[field] = [];
      }
      errorDetails[field].push(error.msg || 'Invalid value');
    });

    // Convert array to single message for each field (for backward compatibility)
    const simplifiedDetails = {};
    Object.keys(errorDetails).forEach((field) => {
      simplifiedDetails[field] = errorDetails[field].length === 1 
        ? errorDetails[field][0] 
        : errorDetails[field];
    });

    throw new ValidationError('Validation failed', simplifiedDetails);
  }

  next();
}

module.exports = {
  validate,
};

