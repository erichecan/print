/**
 * Authentication Controller
* Enhanced with unified error handling
 */
const prisma = require('../lib/prisma');
const { isConnectionError } = require('../lib/prisma');
// Switch to bcryptjs to avoid native build dependency on Windows
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { sendPasswordResetEmail } = require('../services/emailService');
const {
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
  ValidationError,
  InternalServerError,
} = require('../utils/errors');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Helper: Generate JWT token
 */
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// Cookie 配置辅助函数，统一跨域 cookie 设置
// Enhanced with validation and logging
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = {
    httpOnly: true,
    secure: isProduction, // 生产环境必须使用 HTTPS
    sameSite: isProduction ? 'none' : 'lax', // 跨域请求需要 'none'
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: undefined, // 不设置 domain，让浏览器自动处理
    path: '/', // 确保 cookie 在所有路径下可用
  };
  
// 验证 Cookie 配置
  if (isProduction) {
    if (!cookieOptions.secure) {
      console.warn('[Auth] ⚠️  WARNING: Cookie secure flag is false in production!');
    }
    if (cookieOptions.sameSite !== 'none') {
      console.warn('[Auth] ⚠️  WARNING: Cookie sameSite is not "none" in production! This may cause cross-domain issues.');
    }
  }
  
  return cookieOptions;
}

/**
 * POST /api/auth/register - Register new user
* Enhanced error handling and logging
 */
exports.register = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { email, password, firstName, lastName } = req.body;

// Validation with detailed logging
    if (!email || !password) {
      console.log('[Auth] Register validation failed', {
        timestamp,
        hasEmail: !!email,
        hasPassword: !!password
      });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      console.log('[Auth] Register password validation failed', {
        timestamp,
        passwordLength: password.length
      });
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const normalizedEmail = email.toLowerCase();
    console.log('[Auth] Register attempt', {
      timestamp,
      email: normalizedEmail.substring(0, 3) + '***',
      hasPassword: !!password,
      hasFirstName: !!firstName,
      hasLastName: !!lastName
    });

// Check if user already exists with detailed error handling
// 添加连接错误重试逻辑
    let existingUser;
    try {
      existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch (dbError) {
// 如果是连接错误，尝试断开并重连
      if (isConnectionError(dbError)) {
        console.warn('[Auth] Database connection error, attempting to reconnect...', {
          timestamp,
          errorCode: dbError.code,
          errorName: dbError.name
        });
        try {
          await prisma.$disconnect();
// 增加重试等待时间，给 TLS 连接更多时间建立
          await new Promise(resolve => setTimeout(resolve, 200));
          // 重试一次
          existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });
        } catch (retryError) {
          console.error('[Auth] Database error checking existing user (after retry)', {
            timestamp,
            error: retryError.message,
            errorCode: retryError.code,
            errorName: retryError.name,
            email: normalizedEmail.substring(0, 3) + '***',
            stack: process.env.NODE_ENV === 'development' ? retryError.stack : undefined
          });
          return res.status(500).json({ 
            error: 'Database connection error', 
            details: process.env.NODE_ENV === 'development' ? retryError.message : 'Internal server error' 
          });
        }
      } else {
        console.error('[Auth] Database error checking existing user', {
          timestamp,
          error: dbError.message,
          errorCode: dbError.code,
          errorName: dbError.name,
          email: normalizedEmail.substring(0, 3) + '***',
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        });
        return res.status(500).json({ 
          error: 'Database error', 
          details: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error' 
        });
      }
    }

    if (existingUser) {
      console.log('[Auth] User already exists', {
        timestamp,
        email: normalizedEmail.substring(0, 3) + '***'
      });
      return res.status(400).json({ error: 'User with this email already exists' });
    }

// Hash password with error handling
    let passwordHash;
    try {
      passwordHash = await bcrypt.hash(password, 10);
      console.log('[Auth] Password hashed', {
        timestamp,
        email: normalizedEmail.substring(0, 3) + '***'
      });
    } catch (hashError) {
      console.error('[Auth] Password hashing error', {
        timestamp,
        error: hashError.message,
        email: normalizedEmail.substring(0, 3) + '***'
      });
      return res.status(500).json({ error: 'Failed to process password' });
    }

// Create user with detailed error handling
// 添加连接错误重试逻辑
    let user;
    try {
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          firstName: firstName || null,
          lastName: lastName || null,
          role: 'CUSTOMER',
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          emailVerified: true,
          createdAt: true,
        },
      });
      console.log('[Auth] User created', {
        timestamp,
        userId: user.id,
        email: user.email.substring(0, 3) + '***',
        role: user.role
      });
    } catch (dbError) {
// 如果是连接错误，尝试断开并重连
      if (isConnectionError(dbError)) {
        console.warn('[Auth] Database connection error creating user, attempting to reconnect...', {
          timestamp,
          errorCode: dbError.code,
          errorName: dbError.name,
          email: normalizedEmail.substring(0, 3) + '***'
        });
        try {
          await prisma.$disconnect();
// 增加重试等待时间，给 TLS 连接更多时间建立
          await new Promise(resolve => setTimeout(resolve, 200));
          // 重试一次
          user = await prisma.user.create({
            data: {
              email: normalizedEmail,
              passwordHash,
              firstName: firstName || null,
              lastName: lastName || null,
              role: 'CUSTOMER',
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              role: true,
              emailVerified: true,
              createdAt: true,
            },
          });
          console.log('[Auth] User created (after retry)', {
            timestamp,
            userId: user.id,
            email: user.email.substring(0, 3) + '***',
            role: user.role
          });
        } catch (retryError) {
          console.error('[Auth] Database error creating user (after retry)', {
            timestamp,
            error: retryError.message,
            errorCode: retryError.code,
            errorName: retryError.name,
            email: normalizedEmail.substring(0, 3) + '***',
            stack: process.env.NODE_ENV === 'development' ? retryError.stack : undefined,
            meta: retryError.meta || undefined
          });
          return res.status(500).json({ 
            error: 'Database connection error', 
            details: process.env.NODE_ENV === 'development' ? retryError.message : 'Internal server error' 
          });
        }
      } else {
        console.error('[Auth] Database error creating user', {
          timestamp,
          error: dbError.message,
          errorCode: dbError.code,
          errorName: dbError.name,
          email: normalizedEmail.substring(0, 3) + '***',
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined,
          meta: dbError.meta || undefined
        });
        return res.status(500).json({ 
          error: 'Database error', 
          details: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error' 
        });
      }
    }

// Generate token with error handling
    let token;
    try {
      token = generateToken(user.id);
      console.log('[Auth] Token generated', {
        timestamp,
        userId: user.id,
        tokenLength: token.length
      });
    } catch (tokenError) {
      console.error('[Auth] Token generation error', {
        timestamp,
        error: tokenError.message,
        userId: user.id
      });
      return res.status(500).json({ error: 'Failed to generate authentication token' });
    }

// Set cookie with validation
    try {
      const cookieOptions = getCookieOptions();
      res.cookie('token', token, cookieOptions);
      console.log('[Auth] Cookie set', {
        timestamp,
        userId: user.id,
        cookieOptions: {
          httpOnly: cookieOptions.httpOnly,
          secure: cookieOptions.secure,
          sameSite: cookieOptions.sameSite,
          path: cookieOptions.path
        }
      });
    } catch (cookieError) {
      console.error('[Auth] Cookie setting error', {
        timestamp,
        error: cookieError.message,
        userId: user.id
      });
      // 即使设置 cookie 失败，也返回 token，让前端可以手动处理
    }

    console.log('[Auth] Register successful', {
      timestamp,
      userId: user.id,
      email: user.email.substring(0, 3) + '***',
      role: user.role
    });

    res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    console.error('[Auth] Unexpected error registering user', {
      timestamp,
      error: error.message,
      errorName: error.name,
      errorCode: error.code,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({ 
      error: 'Failed to register user',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

/**
 * POST /api/auth/login - Login user
* Enhanced error handling and logging
 */
exports.login = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { email, password } = req.body;

// Validation with detailed logging
    if (!email || !password) {
      console.log('[Auth] Login validation failed', {
        timestamp,
        hasEmail: !!email,
        hasPassword: !!password
      });
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase();
    console.log('[Auth] Login attempt', {
      timestamp,
      email: normalizedEmail.substring(0, 3) + '***',
      hasPassword: !!password
    });

// Find user with detailed error handling
// 添加连接错误重试逻辑
    let user;
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
    } catch (dbError) {
// 如果是连接错误，尝试断开并重连
      if (isConnectionError(dbError)) {
        console.warn('[Auth] Database connection error finding user, attempting to reconnect...', {
          timestamp,
          errorCode: dbError.code,
          errorName: dbError.name,
          email: normalizedEmail.substring(0, 3) + '***'
        });
        try {
          await prisma.$disconnect();
// 增加重试等待时间，给 TLS 连接更多时间建立
          await new Promise(resolve => setTimeout(resolve, 200));
          // 重试一次
          user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
          });
        } catch (retryError) {
          console.error('[Auth] Database error finding user (after retry)', {
            timestamp,
            error: retryError.message,
            errorCode: retryError.code,
            email: normalizedEmail.substring(0, 3) + '***',
            stack: process.env.NODE_ENV === 'development' ? retryError.stack : undefined
          });
          return res.status(500).json({ 
            error: 'Database connection error', 
            details: process.env.NODE_ENV === 'development' ? retryError.message : 'Internal server error' 
          });
        }
      } else {
        console.error('[Auth] Database error finding user', {
          timestamp,
          error: dbError.message,
          errorCode: dbError.code,
          email: normalizedEmail.substring(0, 3) + '***',
          stack: process.env.NODE_ENV === 'development' ? dbError.stack : undefined
        });
        return res.status(500).json({ 
          error: 'Database error', 
          details: process.env.NODE_ENV === 'development' ? dbError.message : 'Internal server error' 
        });
      }
    }

    if (!user) {
      console.log('[Auth] User not found', {
        timestamp,
        email: normalizedEmail.substring(0, 3) + '***'
      });
// 使用通用错误消息，避免泄露用户是否存在
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    console.log('[Auth] User found', {
      timestamp,
      userId: user.id,
      email: user.email.substring(0, 3) + '***',
      role: user.role,
      hasPasswordHash: !!user.passwordHash
    });

// Verify password with detailed error handling
    let isValidPassword = false;
    try {
      if (!user.passwordHash) {
        console.error('[Auth] User has no password hash', {
          timestamp,
          userId: user.id,
          email: user.email.substring(0, 3) + '***'
        });
        return res.status(500).json({ error: 'User account error' });
      }
      
      isValidPassword = await bcrypt.compare(password, user.passwordHash);
      
      console.log('[Auth] Password verification result', {
        timestamp,
        userId: user.id,
        isValid: isValidPassword
      });
    } catch (bcryptError) {
      console.error('[Auth] Bcrypt error', {
        timestamp,
        error: bcryptError.message,
        userId: user.id,
        stack: process.env.NODE_ENV === 'development' ? bcryptError.stack : undefined
      });
      return res.status(500).json({ error: 'Password verification error' });
    }

    if (!isValidPassword) {
      console.log('[Auth] Invalid password', {
        timestamp,
        userId: user.id,
        email: normalizedEmail.substring(0, 3) + '***'
      });
// 使用通用错误消息，避免泄露密码是否正确
      return res.status(401).json({ error: 'Invalid email or password' });
    }

// Generate token
    let token;
    try {
      token = generateToken(user.id);
      console.log('[Auth] Token generated', {
        timestamp,
        userId: user.id,
        tokenLength: token.length
      });
    } catch (tokenError) {
      console.error('[Auth] Token generation error', {
        timestamp,
        error: tokenError.message,
        userId: user.id
      });
      return res.status(500).json({ error: 'Failed to generate authentication token' });
    }

// Set cookie with validation
    try {
      const cookieOptions = getCookieOptions();
      res.cookie('token', token, cookieOptions);
      console.log('[Auth] Cookie set', {
        timestamp,
        userId: user.id,
        cookieOptions: {
          httpOnly: cookieOptions.httpOnly,
          secure: cookieOptions.secure,
          sameSite: cookieOptions.sameSite,
          path: cookieOptions.path
        }
      });
    } catch (cookieError) {
      console.error('[Auth] Cookie setting error', {
        timestamp,
        error: cookieError.message,
        userId: user.id
      });
      // 即使设置 cookie 失败，也返回 token，让前端可以手动处理
    }

    console.log('[Auth] Login successful', {
      timestamp,
      userId: user.id,
      email: user.email.substring(0, 3) + '***',
      role: user.role
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        emailVerified: user.emailVerified,
      },
    });
  } catch (error) {
    console.error('[Auth] Unexpected error logging in', {
      timestamp,
      error: error.message,
      errorName: error.name,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({ 
      error: 'Failed to login', 
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error' 
    });
  }
};

/**
 * POST /api/auth/logout - Logout user
 */
exports.logout = async (req, res) => {
  try {
// 清除 cookie 时使用相同的选项
    const cookieOptions = getCookieOptions();
    delete cookieOptions.maxAge; // clearCookie 不需要 maxAge
    res.clearCookie('token', cookieOptions);

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Error logging out:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};

/**
 * GET /api/auth/me - Get current user
* Enhanced error handling and logging
 */
exports.me = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const userId = req.user?.id;

    console.log('[Auth] Get current user request', {
      timestamp,
      hasUser: !!req.user,
      userId: userId || 'missing'
    });

    if (!userId) {
      console.log('[Auth] No user ID in request', {
        timestamp,
        hasUser: !!req.user
      });
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      console.error('[Auth] User not found in database', {
        timestamp,
        userId
      });
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[Auth] User retrieved successfully', {
      timestamp,
      userId: user.id,
      email: user.email.substring(0, 3) + '***',
      role: user.role
    });

    res.json(user);
  } catch (error) {
    console.error('[Auth] Error getting current user', {
      timestamp,
      error: error.message,
      errorName: error.name,
      userId: req.user?.id,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({ error: 'Failed to get current user' });
  }
};

/**
 * POST /api/auth/forgot-password - Request password reset
* 实现完整的密码重置功能：生成token、保存到数据库、发送邮件
 */
exports.forgotPassword = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });

    // Always return success (security: don't reveal if email exists)
    // Only proceed if user exists
    if (user) {
      // Generate reset token (random 32 bytes, hex encoded = 64 chars)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const tokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      
      // Save reset token to database
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetToken: resetToken,
          passwordResetTokenExpires: tokenExpires,
        },
      });
      
      // Send password reset email
      const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || null;
      try {
        await sendPasswordResetEmail(user.email, resetToken, userName);
        logger.info('Password reset email sent', {
          timestamp,
          userId: user.id,
          email: user.email,
        });
      } catch (emailError) {
        // Log email error but don't fail the request (security best practice)
        logger.error('Failed to send password reset email', {
          timestamp,
          userId: user.id,
          email: user.email,
          error: emailError.message,
        });
        // Continue and return success anyway (don't reveal if email exists)
      }
    }
    
    // Always return success message (security: don't reveal if email exists)
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    logger.error('Error requesting password reset', {
      timestamp,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    res.status(500).json({ error: 'Failed to request password reset' });
  }
};

/**
 * POST /api/auth/reset-password - Reset password
* 实现完整的密码重置功能：验证token、更新密码、清除token
 */
exports.resetPassword = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetTokenExpires: {
          gt: new Date(), // Token must not be expired
        },
      },
    });

    if (!user) {
      logger.warn('Invalid or expired password reset token', {
        timestamp,
        tokenLength: token?.length || 0,
      });
      return res.status(400).json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(password, 10);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newPasswordHash,
        passwordResetToken: null,
        passwordResetTokenExpires: null,
      },
    });

    logger.info('Password reset successfully', {
      timestamp,
      userId: user.id,
      email: user.email,
    });

    res.json({
      message: 'Password has been reset successfully. You can now log in with your new password.',
    });
  } catch (error) {
    logger.error('Error resetting password', {
      timestamp,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * PUT /api/auth/me - Update user profile
* Update user profile information
 */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { firstName, lastName, phone } = req.body;

    // Build update data
    const updateData = {};
    if (firstName !== undefined) {
      updateData.firstName = firstName?.trim() || null;
    }
    if (lastName !== undefined) {
      updateData.lastName = lastName?.trim() || null;
    }
    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }

    // Validate at least one field is provided
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided' });
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

/**
 * PUT /api/auth/me/password - Update password
* Update user password
* Enhanced with password strength validation and unified error handling
 */
exports.updatePassword = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new UnauthorizedError('需要身份验证'));
    }

    const { currentPassword, newPassword } = req.body;

// Validate required fields
    if (!currentPassword || !newPassword) {
      return next(new BadRequestError('当前密码和新密码为必填项', {
        missingFields: {
          currentPassword: !currentPassword,
          newPassword: !newPassword,
        },
      }));
    }

// Validate password strength
    const { validatePasswordStrength } = require('../utils/passwordValidator');
    const passwordValidation = validatePasswordStrength(newPassword);

    if (!passwordValidation.valid) {
      return next(new ValidationError('新密码不符合强度要求', {
        errors: passwordValidation.errors,
        strength: passwordValidation.strength,
      }));
    }

// Check if new password is different from current password
    if (currentPassword === newPassword) {
      return next(new BadRequestError('新密码必须与当前密码不同'));
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return next(new NotFoundError('用户不存在'));
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      logger.warn('Password update failed: incorrect current password', {
        timestamp,
        userId,
        email: user.email.substring(0, 3) + '***',
      });
      return next(new UnauthorizedError('当前密码不正确'));
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
      },
    });

    logger.info('Password updated successfully', {
      timestamp,
      userId,
      email: user.email.substring(0, 3) + '***',
      strength: passwordValidation.strength,
    });

    res.json({
      success: true,
      message: '密码修改成功',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Error updating password', {
      timestamp,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('修改密码失败，请稍后重试'));
  }
};

/**
 * GET /api/auth/check - Diagnostic endpoint for authentication status
* Returns authentication status and configuration info
 */
exports.check = async (req, res) => {
  const timestamp = new Date().toISOString();
  
  try {
    const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '') || null;
    const hasToken = !!token;
    
    // Check JWT_SECRET configuration
    const DEFAULT_JWT_SECRET = 'your_jwt_secret_key_change_in_production';
    const jwtSecret = process.env.JWT_SECRET;
    const usingDefaultSecret = !jwtSecret || jwtSecret === DEFAULT_JWT_SECRET;
    
    // Check cookie configuration
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = getCookieOptions();
    
    // Try to decode token if present
    let tokenInfo = null;
    if (token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.decode(token);
        tokenInfo = {
          hasUserId: !!(decoded?.userId || decoded?.id),
          userId: decoded?.userId || decoded?.id,
          expiresAt: decoded?.exp ? new Date(decoded.exp * 1000).toISOString() : null,
          isExpired: decoded?.exp ? decoded.exp < Date.now() / 1000 : null,
        };
      } catch (decodeError) {
        tokenInfo = {
          error: 'Failed to decode token',
          message: decodeError.message
        };
      }
    }
    
    // Check user if authenticated
    let userInfo = null;
    if (req.user) {
      userInfo = {
        id: req.user.id,
        email: req.user.email?.substring(0, 3) + '***',
        role: req.user.role,
      };
    }
    
    const diagnosticInfo = {
      timestamp,
      authenticated: !!req.user,
      hasToken,
      tokenInfo,
      userInfo,
      configuration: {
        jwtSecret: {
          isSet: !!jwtSecret,
          usingDefault: usingDefaultSecret,
          length: jwtSecret ? jwtSecret.length : 0,
          warning: usingDefaultSecret ? 'Using default JWT_SECRET is insecure!' : null,
        },
        cookie: {
          httpOnly: cookieOptions.httpOnly,
          secure: cookieOptions.secure,
          sameSite: cookieOptions.sameSite,
          path: cookieOptions.path,
          maxAge: cookieOptions.maxAge,
          isProduction,
        },
        environment: {
          nodeEnv: process.env.NODE_ENV,
          isProduction,
        },
      },
    };
    
    console.log('[Auth] Diagnostic check', {
      timestamp,
      authenticated: !!req.user,
      hasToken,
      usingDefaultSecret
    });
    
    res.json(diagnosticInfo);
  } catch (error) {
    console.error('[Auth] Error in diagnostic check', {
      timestamp,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
    res.status(500).json({
      error: 'Failed to perform diagnostic check',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
