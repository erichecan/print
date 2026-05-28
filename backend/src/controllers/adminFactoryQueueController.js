const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');

const prisma = new PrismaClient();

const PRODUCTION_STATUSES = ['QUEUED', 'IN_PRODUCTION', 'DONE'];

async function listFactoryQueue(req, res) {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const where = {
      productionStatus: { not: null },
    };

    if (status && PRODUCTION_STATUSES.includes(status)) {
      where.productionStatus = status;
    } else {
      where.productionStatus = { not: null };
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { sentToFactoryAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          email: true,
          status: true,
          productionStatus: true,
          printToken: true,
          sentToFactoryAt: true,
          createdAt: true,
          total: true,
          shippingAddress: true,
          items: {
            take: 1,
            select: {
              quantity: true,
              variant: {
                select: {
                  color: true,
                  size: true,
                  product: {
                    select: {
                      name: true,
                      images: { take: 1, select: { url: true }, orderBy: { sortOrder: 'asc' } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    const statusCounts = await prisma.order.groupBy({
      by: ['productionStatus'],
      where: { productionStatus: { not: null } },
      _count: { productionStatus: true },
    });

    const counts = { QUEUED: 0, IN_PRODUCTION: 0, DONE: 0, total: 0 };
    for (const row of statusCounts) {
      if (row.productionStatus && counts[row.productionStatus] !== undefined) {
        counts[row.productionStatus] = row._count.productionStatus;
      }
      counts.total += row._count.productionStatus;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayDone = await prisma.order.count({
      where: { productionStatus: 'DONE', updatedAt: { gte: today } },
    });

    res.json({
      data: orders,
      pagination: { page: Number(page), limit: Number(limit), total, totalPages: Math.ceil(total / Number(limit)) },
      stats: { ...counts, todayDone },
    });
  } catch (err) {
    console.error('[Factory Queue] listFactoryQueue error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}

async function sendToFactory(req, res) {
  try {
    const { id } = req.params;
    const { printSpecs } = req.body;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: true, message: 'Order not found' });
    if (order.productionStatus) {
      return res.status(400).json({ error: true, message: 'Order already in factory queue' });
    }

    const printToken = uuidv4();
    const updated = await prisma.order.update({
      where: { id },
      data: {
        productionStatus: 'QUEUED',
        printToken,
        sentToFactoryAt: new Date(),
        ...(printSpecs ? { printSpecs } : {}),
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrData = `${frontendUrl}/factory/scan?token=${printToken}`;
    const qrBase64 = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });

    res.json({ success: true, order: updated, qrCode: qrBase64, printToken });
  } catch (err) {
    console.error('[Factory Queue] sendToFactory error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}

async function updateProductionStatus(req, res) {
  try {
    const { id } = req.params;
    const { productionStatus } = req.body;

    if (!PRODUCTION_STATUSES.includes(productionStatus)) {
      return res.status(400).json({ error: true, message: 'Invalid production status' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ error: true, message: 'Order not found' });
    if (!order.productionStatus) {
      return res.status(400).json({ error: true, message: 'Order not in factory queue' });
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { productionStatus },
    });

    res.json({ success: true, order: updated });
  } catch (err) {
    console.error('[Factory Queue] updateProductionStatus error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}

async function getFilmSheetData(req, res) {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        email: true,
        productionStatus: true,
        printToken: true,
        sentToFactoryAt: true,
        shippingAddress: true,
        printSpecs: true,
        items: {
          select: {
            quantity: true,
            colors: true,
            variant: {
              select: {
                color: true,
                size: true,
                product: {
                  select: {
                    name: true,
                    images: { take: 1, select: { url: true }, orderBy: { sortOrder: 'asc' } },
                    printableAreas: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!order) return res.status(404).json({ error: true, message: 'Order not found' });
    if (!order.printToken) return res.status(400).json({ error: true, message: 'Order not in factory queue' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrData = `${frontendUrl}/factory/scan?token=${order.printToken}`;
    const qrBase64 = await QRCode.toDataURL(qrData, { width: 240, margin: 2 });

    res.json({ order, qrCode: qrBase64 });
  } catch (err) {
    console.error('[Factory Queue] getFilmSheetData error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}

async function getOrderQR(req, res) {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: { orderNumber: true, printToken: true, productionStatus: true },
    });
    if (!order) return res.status(404).json({ error: true, message: 'Order not found' });
    if (!order.printToken) return res.status(400).json({ error: true, message: 'Order not in factory queue' });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const qrData = `${frontendUrl}/factory/scan?token=${order.printToken}`;
    const qrBase64 = await QRCode.toDataURL(qrData, { width: 200, margin: 1 });

    res.json({ qrCode: qrBase64, printToken: order.printToken });
  } catch (err) {
    console.error('[Factory Queue] getOrderQR error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}

async function getGangSheetData(req, res) {
  try {
    const { ids } = req.query;
    if (!ids) return res.status(400).json({ error: true, message: 'ids is required' });
    const idList = ids.split(',').map((s) => s.trim()).filter(Boolean);
    if (!idList.length) return res.status(400).json({ error: true, message: 'No order IDs provided' });

    const orders = await prisma.order.findMany({
      where: { id: { in: idList } },
      select: {
        id: true,
        orderNumber: true,
        email: true,
        productionStatus: true,
        printToken: true,
        printSpecs: true,
        items: {
          select: {
            quantity: true,
            variant: {
              select: {
                color: true,
                size: true,
                product: {
                  select: {
                    name: true,
                    images: { take: 1, select: { url: true }, orderBy: { sortOrder: 'asc' } },
                  },
                },
              },
            },
          },
        },
      },
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const results = await Promise.all(
      idList.map(async (id) => {
        const order = orders.find((o) => o.id === id);
        if (!order || !order.printToken) return null;
        const qrData = `${frontendUrl}/factory/scan?token=${order.printToken}`;
        const qrBase64 = await QRCode.toDataURL(qrData, { width: 180, margin: 1 });
        return { ...order, qrCode: qrBase64 };
      })
    );

    res.json({ data: results.filter(Boolean) });
  } catch (err) {
    console.error('[Factory Queue] getGangSheetData error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}

module.exports = { listFactoryQueue, sendToFactory, updateProductionStatus, getFilmSheetData, getOrderQR, getGangSheetData };
