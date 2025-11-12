const prisma = require('../lib/prisma');

exports.listAuditLogs = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;
    const targetType = req.query.targetType?.toString().trim();
    const targetId = req.query.targetId?.toString().trim();
    const action = req.query.action?.toString().trim();

    const where = {};
    if (targetType) {
      where.targetType = targetType;
    }
    if (targetId) {
      where.targetId = targetId;
    }
    if (action) {
      where.action = { contains: action, mode: 'insensitive' };
    }

    const [logs, total] = await prisma.$transaction([
      prisma.adminAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.adminAuditLog.count({ where }),
    ]);

    res.json({
      data: logs.map((log) => ({
        id: log.id,
        action: log.action,
        actorId: log.actorId,
        actorEmail: log.actorEmail,
        targetType: log.targetType,
        targetId: log.targetId,
        meta: log.meta,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin] Error loading audit logs:', error);
    res.status(500).json({ error: 'Failed to load audit logs' });
  }
};

