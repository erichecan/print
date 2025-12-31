/**
 * Design Template Controller
* 设计模板管理
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// GET /api/templates - 获取模板列表
exports.getTemplates = async (req, res) => {
  try {
    const { category, search, featured, limit = 20, offset = 0 } = req.query;
    
    const where = {
      isActive: true,
    };
    
    if (category) {
      where.category = category;
    }
    
    if (featured === 'true') {
      where.isFeatured = true;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { hasSome: [search] } },
      ];
    }
    
    const [templates, total] = await Promise.all([
      prisma.designTemplate.findMany({
        where,
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
        orderBy: [
          { isFeatured: 'desc' },
          { usageCount: 'desc' },
          { createdAt: 'desc' },
        ],
        include: {
          productCategory: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      prisma.designTemplate.count({ where }),
    ]);
    
    res.json({
      data: templates,
      pagination: {
        total,
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
        hasMore: parseInt(offset, 10) + templates.length < total,
      },
    });
  } catch (error) {
    logger.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
};

// GET /api/templates/:id - 获取模板详情
exports.getTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    const template = await prisma.designTemplate.findUnique({
      where: { id },
      include: {
        productCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
    
    if (!template || !template.isActive) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // 增加使用次数
    await prisma.designTemplate.update({
      where: { id },
      data: { usageCount: { increment: 1 } },
    });
    
    res.json({ data: template });
  } catch (error) {
    logger.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
};

// POST /api/templates/:id/like - 点赞模板
exports.likeTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.designTemplate.update({
      where: { id },
      data: { likesCount: { increment: 1 } },
    });
    
    res.json({ message: 'Template liked successfully' });
  } catch (error) {
    logger.error('Error liking template:', error);
    res.status(500).json({ error: 'Failed to like template' });
  }
};

