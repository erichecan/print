/**
 * Admin User Controller
 * [2025-11-15 14:05:00] Provides user listing and detail views for admin UI
 */
const prisma = require('../lib/prisma');

const normalizeName = (firstName, lastName, email) => {
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();
  return fullName || email;
};

const mapUserSummary = (user, orderTotalsMap) => {
  const totalSpent = orderTotalsMap.get(user.id) || 0;
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: normalizeName(user.firstName, user.lastName, user.email),
    role: user.role,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    orderCount: user._count.orders,
    totalSpent,
  };
};

exports.listUsers = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const role = req.query.role;
    const status = req.query.status;

    const where = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role && role !== 'all') {
      where.role = role.toUpperCase();
    }

    if (status === 'active') {
      where.emailVerified = true;
    } else if (status === 'inactive') {
      where.emailVerified = false;
    }

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
          _count: { select: { orders: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const userIds = users.map((user) => user.id);
    const orderTotals = userIds.length
      ? await prisma.order.groupBy({
          by: ['userId'],
          where: { userId: { in: userIds } },
          _sum: { total: true },
        })
      : [];

    const orderTotalsMap = new Map(
      orderTotals.map((group) => [group.userId, Number(group._sum.total || 0)])
    );

    res.json({
      data: users.map((user) => mapUserSummary(user, orderTotalsMap)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[adminUserController] listUsers error:', error);
    res.status(500).json({ error: 'Failed to load users' });
  }
};

exports.getUserDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
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

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const [orderAggregate, designsCount, recentOrders] = await prisma.$transaction([
      prisma.order.aggregate({
        where: { userId: id },
        _count: { _all: true },
        _sum: { total: true },
      }),
      prisma.design.count({
        where: { userId: id },
      }),
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          paymentStatus: true,
          total: true,
          createdAt: true,
        },
      }),
    ]);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: normalizeName(user.firstName, user.lastName, user.email),
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      stats: {
        totalOrders: orderAggregate._count._all || 0,
        totalSpent: Number(orderAggregate._sum.total || 0),
        designsCreated: designsCount,
        memberSince: user.createdAt,
      },
      recentOrders: recentOrders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus,
        total: Number(order.total),
        createdAt: order.createdAt,
      })),
    });
  } catch (error) {
    console.error('[adminUserController] getUserDetail error:', error);
    res.status(500).json({ error: 'Failed to load user' });
  }
};

/**
 * POST /api/admin/users - Create a new user
 * [2025-01-28 18:30:00] 创建新用户（支持设置角色、激活状态等）
 */
exports.createUser = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone, role, emailVerified } = req.body;

    // [2025-01-28 18:30:00] 验证必填字段
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // [2025-01-28 18:30:00] 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // [2025-01-28 18:30:00] 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // [2025-01-28 18:30:00] 验证角色
    const validRoles = ['CUSTOMER', 'ADMIN'];
    const userRole = role && validRoles.includes(role.toUpperCase()) 
      ? role.toUpperCase() 
      : 'CUSTOMER';

    // [2025-01-28 18:30:00] 处理密码（如果提供）
    let passwordHash = null;
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters' });
      }
      const bcrypt = require('bcryptjs');
      passwordHash = await bcrypt.hash(password, 10);
    } else {
      // [2025-01-28 18:30:00] 如果没有提供密码，生成一个临时密码（用于邀请场景）
      const bcrypt = require('bcryptjs');
      const crypto = require('crypto');
      const tempPassword = crypto.randomBytes(16).toString('hex');
      passwordHash = await bcrypt.hash(tempPassword, 10);
    }

    // [2025-01-28 18:30:00] 创建用户
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
        firstName: firstName || null,
        lastName: lastName || null,
        phone: phone || null,
        role: userRole,
        emailVerified: emailVerified === true || emailVerified === 'true',
      },
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

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: normalizeName(user.firstName, user.lastName, user.email),
        phone: user.phone,
        role: user.role,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('[adminUserController] createUser error:', error);
    
    // [2025-01-28 18:30:00] 处理 Prisma 唯一约束错误
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    res.status(500).json({ error: 'Failed to create user' });
  }
};

