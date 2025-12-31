/**
 * Admin Design Controller
* Provides design review listing and moderation APIs
 */
const prisma = require('../lib/prisma');

const STATUS_LABELS = {
  DRAFT: 'Pending',
  LOCKED: 'Pending',
  ORDERED: 'Approved',
  ARCHIVED: 'Rejected',
};

const STATUS_FILTERS = {
  pending: ['DRAFT', 'LOCKED'],
  approved: ['ORDERED'],
  rejected: ['ARCHIVED'],
};

// 添加空值检查，避免访问 null 对象的属性时出错
const mapDesignSummary = (design) => {
  if (!design) return null;
  
  return {
    id: design.id,
    name: design.name || null,
    status: design.status || null,
    reviewStatus: STATUS_LABELS[design.status] || design.status || null,
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
    thumbnailUrl: design.thumbnailUrl || null,
    user: design.user
      ? {
          id: design.user.id || null,
          email: design.user.email || null,
          firstName: design.user.firstName || null,
          lastName: design.user.lastName || null,
        }
      : null,
    productVariant: design.productVariant
      ? {
          id: design.productVariant.id || null,
          sku: design.productVariant.sku || null,
          color: design.productVariant.color || null,
          size: design.productVariant.size || null,
          product: design.productVariant.product
            ? {
                id: design.productVariant.product.id || null,
                name: design.productVariant.product.name || null,
              }
            : null,
        }
      : null,
  };
};

exports.listDesigns = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const statusFilter = req.query.status?.toLowerCase();

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { productVariant: { product: { name: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (statusFilter && STATUS_FILTERS[statusFilter]) {
      where.status = { in: STATUS_FILTERS[statusFilter] };
    }

    const [designs, total] = await prisma.$transaction([
      prisma.design.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          user: true,
          productVariant: {
            include: {
              product: true,
            },
          },
        },
      }),
      prisma.design.count({ where }),
    ]);

    res.json({
data: designs.map(mapDesignSummary).filter(Boolean), // 过滤掉 null 值
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[adminDesignController] listDesigns error:', error);
    console.error('[adminDesignController] Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({ 
      error: 'Failed to load designs',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};

exports.getDesignDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const design = await prisma.design.findUnique({
      where: { id },
      include: {
        user: true,
        productVariant: {
          include: {
            product: true,
          },
        },
        assets: {
          orderBy: { uploadedAt: 'desc' },
        },
        versions: {
          orderBy: { version: 'desc' },
          take: 25,
        },
      },
    });

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    res.json({
      data: {
        ...mapDesignSummary(design),
        canvasSnapshot: design.canvasSnapshot,
        pricingSnapshot: design.pricingSnapshot,
        assets: design.assets,
        versions: design.versions,
      },
    });
  } catch (error) {
    console.error('[adminDesignController] getDesignDetail error:', error);
    res.status(500).json({ error: 'Failed to load design' });
  }
};

const STATUS_ACTIONS = {
  approve: 'ORDERED',
  reject: 'ARCHIVED',
  pending: 'DRAFT',
  lock: 'LOCKED',
};

exports.updateDesignStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!status || !STATUS_ACTIONS[status]) {
      return res.status(400).json({ error: 'Invalid status action' });
    }

    const design = await prisma.design.findUnique({
      where: { id },
    });

    if (!design) {
      return res.status(404).json({ error: 'Design not found' });
    }

    const nextVersion = design.currentVersion + 1;
    const newStatus = STATUS_ACTIONS[status];

    const updated = await prisma.$transaction(async (tx) => {
      const updatedDesign = await tx.design.update({
        where: { id },
        data: {
          status: newStatus,
          currentVersion: nextVersion,
          updatedAt: new Date(),
        },
        include: {
          user: true,
          productVariant: {
            include: { product: true },
          },
        },
      });

      await tx.designVersion.create({
        data: {
          designId: id,
          version: nextVersion,
          summary: note || `Status updated to ${STATUS_LABELS[newStatus] || newStatus}`,
          canvasSnapshot: design.canvasSnapshot,
          pricingSnapshot: design.pricingSnapshot,
          createdBy: req.user?.id || 'admin',
        },
      });

      return updatedDesign;
    });

    res.json({
      data: {
        ...mapDesignSummary(updated),
        note: note || null,
      },
    });
  } catch (error) {
    console.error('[adminDesignController] updateDesignStatus error:', error);
    res.status(500).json({ error: 'Failed to update design' });
  }
};

