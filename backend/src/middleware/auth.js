/**
 * Authentication Middleware
* Enhanced with unified error handling
* Enhanced JWT_SECRET validation and error handling
 */
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { v4: uuidv4 } = require('uuid');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');
const logger = require('../utils/logger');

// JWT_SECRET 验证和获取函数
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
          logger.warn('[Auth] Token decoded but user not found in database', { userId: decoded.userId || decoded.id });
        }
      } catch (jwtError) {
        // Invalid token, continue as guest
        logger.warn('[Auth] Invalid JWT token in optional auth:', {
          error: jwtError.message,
          errorName: jwtError.name,
          tokenPresent: !!token
        });
      }
    }

// Fixed: Always extract sessionId from cookie regardless of auth state
    // This allows controllers to handle items belonging to the guest session even after login
    // (e.g., merging carts or deleting items before merge)
    let sessionId = req.cookies?.sessionId;

    // Generate or get session ID for guest carts
    if (!req.user && !sessionId) {
      // Generate new session ID
      sessionId = uuidv4();
// Set cookie with cross-domain support
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

    // Always set sessionId on request if it exists
    if (sessionId) {
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
 */
exports.authenticate = async (req, res, next) => {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.replace('Bearer ', '') ||
      null;

// 增强日志输出
    logger.info('[Auth] 🔍 Authentication attempt', {
      path: req.path,
      method: req.method,
      hasCookieToken: !!req.cookies?.token,
      hasAuthHeader: !!req.headers.authorization,
      hasToken: !!token,
      tokenLength: token?.length || 0,
      tokenPreview: token?.substring(0, 20) || 'none',
      cookies: Object.keys(req.cookies || {}),
      origin: req.headers.origin,
      referer: req.headers.referer,
    });

    if (!token) {
      logger.warn('[Auth] ❌ No token provided', {
        path: req.path,
        cookies: req.cookies,
        cookieKeys: Object.keys(req.cookies || {}),
      });
// Avoid crashing server when auth is missing
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
// Surface invalid token as handled error
      return next(new UnauthorizedError('Invalid token: user not found'));
    }

    logger.info('[Auth] ✅ User authenticated', {
      userId: user.id,
      email: user.email,
      role: user.role,
      path: req.path,
    });
    req.user = user;
    next();
  } catch (error) {
    // If it's already an AppError, pass it through
    if (error.isOperational) {
// Pass operational auth errors to Express error handler
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

    logger.error('[Auth] ❌ Authentication failed', {
      error: error.message,
      errorName: error.name,
      path: req.path,
      stack: error.stack,
    });
    return next(new UnauthorizedError('Authentication failed'));
  }
};

/**
* 基于角色的授权中间件
 * 支持多角色（如 ADMIN / SALES / SALES_MANAGER）
 */
exports.authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    logger.info('[Auth] 🔍 Authorization check', {
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url,
      hasUser: !!req.user,
      userRole: req.user?.role,
      userRoleType: typeof req.user?.role,
      userRoleRaw: req.user?.role,
      allowedRoles: allowedRoles,
      allowedRolesType: typeof allowedRoles[0],
    });

    if (!req.user) {
      logger.warn('[Auth] ❌ No user in request', {
        path: req.path,
        originalUrl: req.originalUrl,
      });
      return next(new UnauthorizedError('Please login to access this resource'));
    }

    const userRoleRaw = req.user.role || '';
    const userRole = String(userRoleRaw).toUpperCase();
    const allowed = allowedRoles.map((r) => String(r).toUpperCase());

    logger.info('[Auth] 🔍 Role comparison', {
      userRoleRaw,
      userRole,
      allowedRolesRaw: allowedRoles,
      allowedRoles: allowed,
      isAllowed: allowed.includes(userRole),
      comparison: {
        salesManagerEquals: 'SALES_MANAGER' === 'SALES_MANAGER',
        salesManagerInAllowed: allowed.includes('SALES_MANAGER'),
        userRoleInAllowed: allowed.includes(userRole),
      },
    });

    if (!allowed.includes(userRole)) {
      logger.warn('[Auth] ❌ Access denied', {
        userRoleRaw,
        userRole,
        allowedRolesRaw: allowedRoles,
        allowedRoles: allowed,
        path: req.path,
        originalUrl: req.originalUrl,
      });
      return next(new ForbiddenError('You do not have permission to access this resource'));
    }

    logger.info('[Auth] ✅ Authorization passed', {
      userRole,
      userRoleRaw,
      allowedRoles: allowed,
      path: req.path,
      originalUrl: req.originalUrl,
      baseUrl: req.baseUrl,
      url: req.url,
    });

    next();
  };
};

/**
 * Admin only middleware
 * Requires authentication AND admin role
* 使用 authorizeRoles 统一角色判断
 */
exports.requireAdmin = [
  exports.authenticate,
  exports.authorizeRoles('ADMIN'),
];
