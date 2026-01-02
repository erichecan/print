/**
 * Error Handler Middleware
* Unified error handling middleware
* Enhanced error logging with more context
 */
const logger = require('../utils/logger');
const { AppError } = require('../utils/errors');
// 安全地导入 ValidationError，避免 undefined 导致 instanceof 错误
let ExpressValidationError;
try {
  const expressValidator = require('express-validator');
  ExpressValidationError = expressValidator.ValidationError || expressValidator.Result?.ValidationError;
} catch (error) {
  // express-validator 可能未安装或版本不同
  ExpressValidationError = null;
}

/**
 * Handle validation errors from express-validator
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
 */
function formatErrorResponse(err, req) {
  // Get traceId from request
  const traceId = req.traceId || req.headers['x-request-id'] || 'no-trace-id';

  // Handle custom AppError
  if (err instanceof AppError) {
    const errorData = err.toJSON();
    errorData.traceId = traceId;
    return errorData;
  }

  // Handle express-validator errors
  // Check if error has array() method (express-validator format)
  if (err.array && typeof err.array === 'function') {
    const result = handleValidationError(err);
    result.traceId = traceId;
    result.category = 'VALIDATION_ERROR';
    return result;
  }

  // Also check for ValidationError instance
  // 安全地检查 instanceof，避免 ExpressValidationError 未定义
  if ((ExpressValidationError && err instanceof ExpressValidationError) || err.name === 'ValidationError') {
    const result = handleValidationError(err);
    result.traceId = traceId;
    result.category = 'VALIDATION_ERROR';
    return result;
  }

  // Handle Prisma errors
  if (err.code && err.code.startsWith('P')) {
    const result = handlePrismaError(err);
    result.traceId = traceId;
    result.category = 'DATABASE_ERROR';
    return result;
  }

  // Handle Stripe errors
  if (err.type && err.type.startsWith('Stripe')) {
    const result = handleStripeError(err);
    result.traceId = traceId;
    result.category = 'DEPENDENCY_ERROR';
    return result;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return {
      success: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Invalid token',
      category: 'AUTH_ERROR',
      traceId,
      timestamp: new Date().toISOString(),
    };
  }

  if (err.name === 'TokenExpiredError') {
    return {
      success: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Token expired',
      category: 'AUTH_ERROR',
      traceId,
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
    category: statusCode === 500 ? 'SERVER_ERROR' : 'UNKNOWN',
    traceId,
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
 */
function errorHandler(err, req, res, next) {
  // Log error
  const errorResponse = formatErrorResponse(err, req);

  // Enhanced error logging with more context
  const logContext = {
    error: err.message,
    statusCode: errorResponse.statusCode,
    code: errorResponse.code,
    category: errorResponse.category,
    traceId: errorResponse.traceId, // Use traceId from response
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || null,
    timestamp: new Date().toISOString(),
    ...(errorResponse.details && { details: errorResponse.details }),
  };

  if (errorResponse.statusCode >= 500) {
    // Server errors: log full stack trace and additional context
    logger.error('Server error', {
      ...logContext,
      stack: err.stack,
      originalError: err.name,
    });
  } else if (errorResponse.statusCode >= 400) {
    // Client errors: log warning with context
    logger.warn('Client error', logContext);
  } else {
    // Other errors: log info
    logger.info('Error handled', logContext);
  }

  // Send error response
  res.status(errorResponse.statusCode).json(errorResponse);
}

/**
 * Async handler wrapper to catch async errors
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 */
function notFoundHandler(req, res) {
  const traceId = req.traceId || req.headers['x-request-id'] || 'no-trace-id';
  res.status(404).json({
    success: false,
    statusCode: 404,
    code: 'NOT_FOUND',
    message: 'Route not found',
    category: 'CLIENT_ERROR',
    traceId,
    path: req.path,
    timestamp: new Date().toISOString(),
  });
}

module.exports = {
  errorHandler,
  asyncHandler,
  notFoundHandler,
};

