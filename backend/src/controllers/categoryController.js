/**
 * Category Controller (Public)
 * [2025-01-27 18:50:00] 提供公共分类列表接口，用于首页展示
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// [2025-01-27 18:50:00] 获取所有活跃的分类（用于首页展示）
exports.listCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        parentId: null, // 只返回一级分类
      },
      orderBy: {
        sortOrder: 'asc',
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        imageUrl: true,
        sortOrder: true,
      },
    });

    res.json({
      data: categories,
    });
  } catch (error) {
    logger.error('[2025-01-27 18:50:00] listCategories error:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch categories',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
      }),
    });
  }
};

// [2025-01-27 18:50:00] 根据 slug 获取分类详情
exports.getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Category not found',
      });
    }

    res.json(category);
  } catch (error) {
    logger.error('[2025-01-27 18:50:00] getCategoryBySlug error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch category',
    });
  }
};

