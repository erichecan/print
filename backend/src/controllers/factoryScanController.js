const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const VALID_STATUSES = ['QUEUED', 'IN_PRODUCTION', 'DONE'];

async function getOrderByToken(req, res) {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: true, message: 'Token required' });

    const order = await prisma.order.findFirst({
      where: { printToken: token },
      select: {
        id: true,
        orderNumber: true,
        email: true,
        productionStatus: true,
        printSpecs: true,
        shippingAddress: true,
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

    if (!order) return res.status(404).json({ error: true, message: 'Order not found' });

    res.json({ order });
  } catch (err) {
    console.error('[Factory Scan] getOrderByToken error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}

async function updateStatusByToken(req, res) {
  try {
    const { token, productionStatus } = req.body;
    if (!token) return res.status(400).json({ error: true, message: 'Token required' });

    if (!VALID_STATUSES.includes(productionStatus)) {
      return res.status(400).json({ error: true, message: 'Invalid production status' });
    }

    const order = await prisma.order.findFirst({ where: { printToken: token } });
    if (!order) return res.status(404).json({ error: true, message: 'Order not found' });

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { productionStatus },
    });

    res.json({ success: true, productionStatus: updated.productionStatus });
  } catch (err) {
    console.error('[Factory Scan] updateStatusByToken error:', err);
    res.status(500).json({ error: true, message: err.message });
  }
}

module.exports = { getOrderByToken, updateStatusByToken };
