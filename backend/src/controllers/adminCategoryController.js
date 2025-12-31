/**
 * Admin Category Controller
* 提供后台分类管理接口
 */
const prisma = require('../lib/prisma');

// 分类列表（分页 / 搜索）
exports.listCategories = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 500);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const parentId = req.query.parentId;
    const status = req.query.status;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (parentId) {
      where.parentId = parentId;
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const [categories, total] = await prisma.$transaction([
      prisma.category.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          sortOrder: 'asc',
        },
        include: {
          parent: {
            select: { id: true, name: true },
          },
          _count: {
            select: { products: true, children: true },
          },
        },
      }),
      prisma.category.count({ where }),
    ]);

    res.json({
      data: categories,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
console.error(' listCategories error:', error);
    res.status(500).json({ error: 'Failed to load categories' });
  }
};

// 获取单个分类
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        children: {
          select: { id: true, name: true, isActive: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    return res.json(category);
  } catch (error) {
console.error(' getCategoryById error:', error);
    return res.status(500).json({ error: 'Failed to load category' });
  }
};

// 创建分类
exports.createCategory = async (req, res) => {
  try {
    const {
      name,
      slug,
      description,
      imageUrl,
      parentId,
      sortOrder = 0,
      isActive = true,
    } = req.body || {};

    if (!name || !slug) {
      return res.status(400).json({ error: 'Name and slug are required' });
    }

    try {
      const category = await prisma.category.create({
        data: {
          name,
          slug,
          description: description || null,
          imageUrl: imageUrl || null,
          parentId: parentId || null,
          sortOrder,
          isActive,
        },
      });

      return res.status(201).json(category);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Slug already exists' });
      }
      throw error;
    }
  } catch (error) {
console.error(' createCategory error:', error);
    return res.status(500).json({ error: 'Failed to create category' });
  }
};

// 更新分类
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      description,
      imageUrl,
      parentId,
      sortOrder,
      isActive,
    } = req.body || {};

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    try {
      const category = await prisma.category.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(slug !== undefined ? { slug } : {}),
          ...(description !== undefined ? { description } : {}),
          ...(imageUrl !== undefined ? { imageUrl } : {}),
          ...(parentId !== undefined ? { parentId: parentId || null } : {}),
          ...(sortOrder !== undefined ? { sortOrder } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });

      return res.json(category);
    } catch (error) {
      if (error.code === 'P2002') {
        return res.status(409).json({ error: 'Slug already exists' });
      }
      throw error;
    }
  } catch (error) {
console.error(' updateCategory error:', error);
    return res.status(500).json({ error: 'Failed to update category' });
  }
};

// 软删除分类
exports.archiveCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.category.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await prisma.category.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return res.json({ success: true });
  } catch (error) {
console.error(' archiveCategory error:', error);
    return res.status(500).json({ error: 'Failed to archive category' });
  }
};


