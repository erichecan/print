/**
 * Category Controller (Public)
 * [2025-01-27 18:50:00] 提供公共分类列表接口，用于首页展示
 * [2025-12-02 14:13:10] 分类公共接口说明：所有前台分类展示统一从 category 表读取，不再直接依赖静态类目配置
 * [2025-12-11 09:21:35] 添加树状分类 API 端点
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { getCategoryTree, getTreeWithCounts, getProductsByCategorySlug } = require('../services/categories');

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

// [2025-12-11 09:21:35] 获取树状分类（含产品计数）
exports.getCategoryTree = async (req, res) => {
  try {
    const tree = await getCategoryTree();
    res.json({
      data: tree,
    });
  } catch (error) {
    logger.error('[2025-12-11 09:21:35] getCategoryTree error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch category tree',
    });
  }
};

// [2025-12-11 23:05:00] 获取分组分类树（含精确计数）
exports.getTreeWithCounts = async (req, res) => {
  try {
    const strategy = (req.query.strategy === 'aggregate') ? 'aggregate' : 'direct';
    const groups = await getTreeWithCounts({ strategy });
    
    res.json({
      groups,
      meta: {
        countStrategy: strategy,
      },
    });
  } catch (error) {
    logger.error('[2025-12-11 23:05:00] getTreeWithCounts error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch category tree with counts',
    });
  }
};

// [2025-12-11 23:05:00] 根据分类 slug 获取产品列表
exports.getProductsByCategorySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 24;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';

    const result = await getProductsByCategorySlug(slug, {
      page,
      limit,
      sortBy,
      sortOrder,
    });

    res.json({
      data: result.products,
      pagination: result.pagination,
      category: result.category,
    });
  } catch (error) {
    logger.error('[2025-12-11 23:05:00] getProductsByCategorySlug error:', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch products by category',
    });
  }
};

