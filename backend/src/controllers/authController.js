/**
 * Authentication Controller
 * [2025-11-05 01:00:00]
 */
const prisma = require('../lib/prisma');
// [2025-11-09 20:50:12] Switch to bcryptjs to avoid native build dependency on Windows
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

/**
 * Helper: Generate JWT token
 */
function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// [2025-11-15 12:25:00] Cookie 配置辅助函数，统一跨域 cookie 设置
function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction, // 生产环境必须使用 HTTPS
    sameSite: isProduction ? 'none' : 'lax', // 跨域请求需要 'none'
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    domain: undefined, // 不设置 domain，让浏览器自动处理
    path: '/', // 确保 cookie 在所有路径下可用
  };
}

/**
 * POST /api/auth/register - Register new user
 * [2025-11-05 01:00:00]
 */
exports.register = async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
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

    // Generate token
    const token = generateToken(user.id);

    // Set cookie
    res.cookie('token', token, getCookieOptions());

    res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
};

/**
 * POST /api/auth/login - Login user
 * [2025-11-05 01:00:00]
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Generate token
    const token = generateToken(user.id);

    // Set cookie
    res.cookie('token', token, getCookieOptions());

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
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
};

/**
 * POST /api/auth/logout - Logout user
 * [2025-11-05 01:00:00]
 */
exports.logout = async (req, res) => {
  try {
    // [2025-11-15 12:25:00] 清除 cookie 时使用相同的选项
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
 * [2025-11-05 01:00:00]
 */
exports.me = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
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
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get current user' });
  }
};

/**
 * POST /api/auth/forgot-password - Request password reset
 * [2025-11-05 01:00:00]
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    // Always return success (security: don't reveal if email exists)
    // In production, send password reset email here
    // For now, just return success message
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ error: 'Failed to request password reset' });
  }
};

/**
 * POST /api/auth/reset-password - Reset password
 * [2025-11-05 01:00:00]
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ error: 'Token and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    // In production, verify token and find user
    // For now, return error (not implemented in Phase 1)
    res.status(501).json({ error: 'Password reset not implemented yet' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
};

/**
 * PUT /api/auth/me - Update user profile
 * [2025-01-27 14:40:00] Update user profile information
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
 * [2025-01-27 14:40:00] Update user password
 */
exports.updatePassword = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
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

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error updating password:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
};
