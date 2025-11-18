/**
 * Authentication Middleware
 * [2025-11-04 23:51:00]
 * [2025-01-27 11:20:00] Enhanced with unified error handling
 */
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

/**
 * Optional authentication middleware
 * Sets req.user if token is valid, otherwise allows request to proceed
 * Also manages session for guest carts
 * [2025-11-04 23:51:00]
 */
exports.authenticateOptional = async (req, res, next) => {
  try {
    // Try to get token from cookie or Authorization header
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace('Bearer ', '') ||
      null;

    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production');
        
        // Get user from database
        const user = await prisma.user.findUnique({
          where: { id: decoded.userId || decoded.id },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
          },
        });

        if (user) {
          req.user = user;
        }
      } catch (jwtError) {
        // Invalid token, continue as guest
        logger.debug('Invalid JWT token in optional auth:', jwtError.message);
      }
    }

    // Generate or get session ID for guest carts
    if (!req.user) {
      // Check for session token in cookie
      let sessionId = req.cookies?.sessionId;
      
      if (!sessionId) {
        // Generate new session ID
        sessionId = uuidv4();
        // Set cookie (expires in 30 days)
        res.cookie('sessionId', sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });
      }
      
      req.sessionId = sessionId;
    }

    next();
  } catch (error) {
    logger.error('Authentication middleware error:', error);
    // Continue as guest on error
    next();
  }
};

/**
 * Required authentication middleware
 * Returns 401 if user is not authenticated
 * [2025-11-04 23:51:00]
 */
exports.authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace('Bearer ', '') ||
      null;

    if (!token) {
      // [2025-11-18 11:58:00] Avoid crashing server when auth is missing
      return next(new UnauthorizedError('Please login to access this resource'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production');
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId || decoded.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      // [2025-11-18 11:58:00] Surface invalid token as handled error
      return next(new UnauthorizedError('Invalid token'));
    }

    req.user = user;
    next();
  } catch (error) {
    // If it's already an AppError, pass it through
    if (error.isOperational) {
      // [2025-11-18 11:58:00] Pass operational auth errors to Express error handler
      return next(error);
    }
    
    // Handle JWT errors
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    
    logger.error('Authentication error:', error);
    return next(new UnauthorizedError('Authentication failed'));
  }
};

/**
 * Admin only middleware
 * Requires authentication AND admin role
 * [2025-11-04 23:51:00]
 */
exports.requireAdmin = [
  exports.authenticate,
  (req, res, next) => {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenError('Admin access required');
    }
    next();
  },
];
