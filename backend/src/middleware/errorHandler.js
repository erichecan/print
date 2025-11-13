/**
 * Error Handler Middleware
 * [2025-01-27 11:05:00] Unified error handling middleware
 */
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
const { ValidationError: ExpressValidationError } = require('express-validator');

/**
 * Handle validation errors from express-validator
 * [2025-01-27 11:05:00]
 */
function handleValidationError(err) {
  const errors = {};
  
  // Handle different express-validator error formats
  const errorArray = err.array ? err.array() : err.errors || [];
  
  errorArray.forEach((error) => {
    const field = error.param || error.path || error.field || 'unknown';
    const message = error.msg || error.message || 'Invalid value';
    
    if (!errors[field]) {
      errors[field] = [];
    }
    errors[field].push(message);
  });

  // Convert array to single message for each field (for backward compatibility)
  const simplifiedDetails = {};
  Object.keys(errors).forEach((field) => {
    simplifiedDetails[field] = errors[field].length === 1 
      ? errors[field][0] 
      : errors[field];
  });

  return {
    success: false,
    statusCode: 422,
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: simplifiedDetails,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle Prisma errors
 * [2025-01-27 11:05:00]
 */
function handlePrismaError(err) {
  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] || 'field';
    return {
      success: false,
      statusCode: 409,
      code: 'CONFLICT',
      message: `${field} already exists`,
      details: { field },
      timestamp: new Date().toISOString(),
    };
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return {
      success: false,
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Resource not found',
      timestamp: new Date().toISOString(),
    };
  }

  // Prisma foreign key constraint violation
  if (err.code === 'P2003') {
    return {
      success: false,
      statusCode: 400,
      code: 'BAD_REQUEST',
      message: 'Invalid reference',
      timestamp: new Date().toISOString(),
    };
  }

  // Default Prisma error
  return {
    success: false,
    statusCode: 400,
    code: 'BAD_REQUEST',
    message: 'Database operation failed',
    timestamp: new Date().toISOString(),
  };
}

/**
 * Handle Stripe errors
 * [2025-01-27 11:05:00]
 */
function handleStripeError(err) {
  const statusCode = err.statusCode || 400;
  return {
    success: false,
    statusCode,
    code: err.type || 'PAYMENT_ERROR',
    message: err.message || 'Payment processing failed',
    details: process.env.NODE_ENV === 'development' ? { stripeCode: err.code } : undefined,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Format error response
 * [2025-01-27 11:05:00]
 */
function formatErrorResponse(err, req) {
  // Handle custom AppError
  if (err instanceof AppError) {
    return err.toJSON();
  }

  // Handle express-validator errors
  // Check if error has array() method (express-validator format)
  if (err.array && typeof err.array === 'function') {
    return handleValidationError(err);
  }
  
  // Also check for ValidationError instance
  if (err instanceof ExpressValidationError || err.name === 'ValidationError') {
    return handleValidationError(err);
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    return handlePrismaError(err);
  }

  // Handle Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    return handleStripeError(err);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return {
      success: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Invalid token',
      timestamp: new Date().toISOString(),
    };
  }

  if (err.name === 'TokenExpiredError') {
    return {
      success: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Token expired',
      timestamp: new Date().toISOString(),
    };
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  return {
    success: false,
    statusCode,
    code: 'INTERNAL_SERVER_ERROR',
    message: statusCode === 500 ? 'Internal server error' : err.message || 'An error occurred',
    ...(process.env.NODE_ENV === 'development' && {
      details: {
        error: err.message,
        stack: err.stack,
      },
    }),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Error handler middleware
 * [2025-01-27 11:05:00]
 */
function errorHandler(err, req, res, next) {
  // Log error
  const errorResponse = formatErrorResponse(err, req);

  // Log error details
  if (errorResponse.statusCode >= 500) {
    logger.error('Server error', {
      error: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  } else {
    logger.warn('Client error', {
      error: err.message,
      statusCode: errorResponse.statusCode,
      code: errorResponse.code,
      url: req.url,
      method: req.method,
      ip: req.ip,
    });
  }

  // Send error response
  res.status(errorResponse.statusCode).json(errorResponse);
}

/**
 * Async handler wrapper to catch async errors
 * [2025-01-27 11:05:00]
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * [2025-01-27 11:05:00]
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'Route not found',
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};

