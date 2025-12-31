/**
 * User Design Controller
* 用户设计列表控制器
 */
const prisma = require('../lib/prisma');

/**
 * 获取用户的设计列表
 * GET /api/user/designs?days=30
 * 
 * Query Parameters:
 * - days: 筛选天数（0表示全部，默认0）
 */
exports.listUserDesigns = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = parseInt(req.query.days, 10) || 0;
    
    // 构建查询条件
    const where = {
      userId: userId,
    };
    
// 如果指定了天数，筛选 updatedAt 在指定天数内的设计
    if (days > 0) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      where.updatedAt = {
        gte: cutoffDate,
      };
    }
    
    // 查询设计列表
    const designs = await prisma.design.findMany({
      where,
      orderBy: { updatedAt: 'desc' }, // 按最后编辑时间降序
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    
    // 格式化返回数据
    const formattedDesigns = designs.map(design => ({
      id: design.id,
      name: design.name,
      thumbnailUrl: design.thumbnailUrl,
      createdAt: design.createdAt.toISOString(),
updatedAt: design.updatedAt.toISOString(), // 添加 updatedAt
      productName: design.variant?.product?.name || null,
    }));
    
    res.json({
      designs: formattedDesigns,
      total: formattedDesigns.length,
    });
  } catch (error) {
    console.error('[userDesignController] listUserDesigns error:', error);
    res.status(500).json({ 
      error: 'Failed to load designs',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};

