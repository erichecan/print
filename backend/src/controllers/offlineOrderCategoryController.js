/**
 * Offline Category Controller
 * 线下商品分类管理接口（独立于线上 categories 表）
 */
const prisma = require('../lib/prisma');

exports.listCategories = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 500);
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
    } else {
      where.isActive = true;
    }

    const [categories, total] = await Promise.all([
      prisma.offlineCategory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sortOrder: 'asc' },
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { offlineProducts: true, children: true } },
        },
      }),
      prisma.offlineCategory.count({ where }),
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
    console.error('listOfflineCategories error:', error);
    res.status(500).json({ error: 'Failed to load offline categories' });
  }
};

exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const category = await prisma.offlineCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, name: true } },
        children: {
          select: { id: true, name: true, isActive: true, sortOrder: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!category) {
      return res.status(404).json({ error: 'Offline category not found' });
    }

    return res.json(category);
  } catch (error) {
    console.error('getOfflineCategoryById error:', error);
    return res.status(500).json({ error: 'Failed to load offline category' });
  }
};

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
      const category = await prisma.offlineCategory.create({
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
    console.error('createOfflineCategory error:', error);
    return res.status(500).json({ error: 'Failed to create offline category' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, description, imageUrl, parentId, sortOrder, isActive } = req.body || {};

    const existing = await prisma.offlineCategory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Offline category not found' });
    }

    try {
      const category = await prisma.offlineCategory.update({
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
    console.error('updateOfflineCategory error:', error);
    return res.status(500).json({ error: 'Failed to update offline category' });
  }
};

exports.archiveCategory = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.offlineCategory.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Offline category not found' });
    }

    await prisma.offlineCategory.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('archiveOfflineCategory error:', error);
    return res.status(500).json({ error: 'Failed to archive offline category' });
  }
};
