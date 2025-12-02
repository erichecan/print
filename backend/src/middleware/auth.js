/**
 * Authentication Middleware
 * [2025-11-04 23:51:00]
 * [2025-01-27 11:20:00] Enhanced with unified error handling
 * [2025-12-02 03:30:00] Enhanced JWT_SECRET validation and error handling
 */
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

// [2025-12-02 03:30:00] JWT_SECRET 验证和获取函数
const DEFAULT_JWT_SECRET = 'your_jwt_secret_key_change_in_production';
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === DEFAULT_JWT_SECRET) {
    logger.warn('[Auth] ⚠️  WARNING: JWT_SECRET is not set or using default value. This is a security risk!');
    logger.warn('[Auth] Please set JWT_SECRET environment variable to a strong random string.');
    if (process.env.NODE_ENV === 'production') {
      logger.error('[Auth] ❌ CRITICAL: Using default JWT_SECRET in production is extremely dangerous!');
    }
  }
  return secret || DEFAULT_JWT_SECRET;
}

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
        const jwtSecret = getJwtSecret();
        logger.debug('[Auth] Verifying token in optional auth', { 
          hasToken: !!token, 
          tokenLength: token.length,
          usingDefaultSecret: !process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET
        });
        
        const decoded = jwt.verify(token, jwtSecret);
        
        logger.debug('[Auth] Token decoded successfully', { 
          userId: decoded.userId || decoded.id,
          hasUserId: !!(decoded.userId || decoded.id)
        });
        
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
          logger.debug('[Auth] User authenticated in optional auth', { userId: user.id, email: user.email });
        } else {
          logger.debug('[Auth] User not found in database', { userId: decoded.userId || decoded.id });
        }
      } catch (jwtError) {
        // Invalid token, continue as guest
        logger.debug('[Auth] Invalid JWT token in optional auth:', {
          error: jwtError.message,
          errorName: jwtError.name,
          tokenPresent: !!token
        });
      }
    }

    // Generate or get session ID for guest carts
    if (!req.user) {
      // Check for session token in cookie
      let sessionId = req.cookies?.sessionId;
      
      if (!sessionId) {
        // Generate new session ID
        sessionId = uuidv4();
        // [2025-01-29 00:25:00] Set cookie with cross-domain support
        // 在生产环境中，前端和后端可能在不同域名，需要 sameSite: 'none' 和 secure: true
        const isProduction = process.env.NODE_ENV === 'production';
        res.cookie('sessionId', sessionId, {
          httpOnly: true,
          secure: isProduction, // 生产环境必须使用 HTTPS
          sameSite: isProduction ? 'none' : 'lax', // 跨域请求需要 'none'
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
          path: '/', // 确保 cookie 在所有路径下可用
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

    // [2025-12-02 03:30:00] 详细记录认证尝试
    logger.debug('[Auth] Authentication attempt', {
      hasCookieToken: !!req.cookies?.token,
      hasAuthHeader: !!req.headers.authorization,
      hasToken: !!token,
      path: req.path,
      method: req.method
    });

    if (!token) {
      logger.debug('[Auth] No token provided', { path: req.path });
      // [2025-11-18 11:58:00] Avoid crashing server when auth is missing
      return next(new UnauthorizedError('Please login to access this resource'));
    }

    const jwtSecret = getJwtSecret();
    logger.debug('[Auth] Verifying token', {
      tokenLength: token.length,
      usingDefaultSecret: !process.env.JWT_SECRET || process.env.JWT_SECRET === DEFAULT_JWT_SECRET
    });

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
      logger.debug('[Auth] Token verified successfully', {
        userId: decoded.userId || decoded.id,
        hasUserId: !!(decoded.userId || decoded.id)
      });
    } catch (jwtError) {
      logger.warn('[Auth] Token verification failed', {
        error: jwtError.message,
        errorName: jwtError.name,
        tokenLength: token.length
      });
      
      // Handle specific JWT errors
      if (jwtError.name === 'JsonWebTokenError') {
        return next(new UnauthorizedError('Invalid token'));
      }
      if (jwtError.name === 'TokenExpiredError') {
        return next(new UnauthorizedError('Token expired'));
      }
      throw jwtError; // Re-throw to be handled by outer catch
    }
    
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      logger.warn('[Auth] Token decoded but no userId found', { decoded });
      return next(new UnauthorizedError('Invalid token: missing user ID'));
    }

    logger.debug('[Auth] Fetching user from database', { userId });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      },
    });

    if (!user) {
      logger.warn('[Auth] User not found in database', { userId });
      // [2025-11-18 11:58:00] Surface invalid token as handled error
      return next(new UnauthorizedError('Invalid token: user not found'));
    }

    logger.debug('[Auth] User authenticated successfully', { userId: user.id, email: user.email, role: user.role });
    req.user = user;
    next();
  } catch (error) {
    // If it's already an AppError, pass it through
    if (error.isOperational) {
      // [2025-11-18 11:58:00] Pass operational auth errors to Express error handler
      return next(error);
    }
    
    // Handle JWT errors (should already be handled above, but catch any edge cases)
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      logger.warn('[Auth] JWT error in catch block', {
        error: error.message,
        errorName: error.name
      });
      return next(new UnauthorizedError('Invalid or expired token'));
    }
    
    logger.error('[Auth] Unexpected authentication error:', {
      error: error.message,
      errorName: error.name,
      stack: error.stack,
      path: req.path
    });
    return next(new UnauthorizedError('Authentication failed'));
  }
};

/**
 * [2025-12-02 04:46:00] 基于角色的授权中间件
 * 支持多角色（如 ADMIN / SALES / SALES_MANAGER）
 */
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Please login to access this resource'));
    }
    const userRoleRaw = req.user.role || '';
    const userRole = String(userRoleRaw).toUpperCase();
    const allowed = allowedRoles.map((r) => String(r).toUpperCase());

    if (!allowed.includes(userRole)) {
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }

    next();
  };
};

/**
 * Admin only middleware
 * Requires authentication AND admin role
 * [2025-11-04 23:51:00]
 * [2025-12-02 04:46:00] 使用 authorizeRoles 统一角色判断
 */
exports.requireAdmin = [
  exports.authenticate,
  exports.authorizeRoles('ADMIN'),
];
