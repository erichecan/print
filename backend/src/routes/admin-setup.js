// [2025-11-28 12:50:00] 临时路由：快速创建 admin 用户
// 注意：这是一个临时修复路由，生产环境应该禁用
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@suvernireplus.com';
const ADMIN_PASSWORD = 'admin123';

// [2025-11-28 12:50:00] POST /api/admin-setup/create-user - 创建 admin 用户
router.post('/create-user', async (req, res) => {
  try {
    console.log('🔧 开始创建 admin 用户...');
    
    // 检查用户是否已存在
    let user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });
    
    if (user) {
      // 更新密码
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      user = await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          passwordHash: hashedPassword,
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      
      return res.json({
        success: true,
        message: 'Admin 用户密码已更新',
        user: {
          email: user.email,
          role: user.role,
        },
      });
    } else {
      // 创建新用户
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      user = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          passwordHash: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      
      return res.json({
        success: true,
        message: 'Admin 用户已创建',
        user: {
          email: user.email,
          role: user.role,
        },
      });
    }
  } catch (error) {
    console.error('❌ 创建 admin 用户失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;

