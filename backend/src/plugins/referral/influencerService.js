const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

const prisma = new PrismaClient();

// 48-hour window, 2+ hits from same fingerprint triggers freeze
const FRAUD_WINDOW_MS = 48 * 60 * 60 * 1000;
const FRAUD_THRESHOLD = 2;
const FREEZE_DAYS = 30;

async function createCode({ code, ownerUserId, label, discountPct, commissionPct, monthlyLimit }) {
  if (!code || !ownerUserId) throw new Error('code and ownerUserId are required');

  const normalized = code.toUpperCase().trim();
  if (!/^[A-Z0-9]{3,30}$/.test(normalized)) {
    throw new Error('Code must be 3–30 alphanumeric characters');
  }

  return prisma.influencerCode.create({
    data: {
      id: uuidv4(),
      code: normalized,
      ownerUserId,
      label: label || '',
      discountPct: discountPct ?? 0,
      commissionPct: commissionPct ?? 10,
      monthlyLimit: monthlyLimit ?? 50,
      isActive: true,
    },
  });
}

async function updateCode(id, fields) {
  return prisma.influencerCode.update({ where: { id }, data: fields });
}

async function listCodes({ page = 1, limit = 20 } = {}) {
  const [codes, total] = await Promise.all([
    prisma.influencerCode.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { _count: { select: { usages: true } } },
    }),
    prisma.influencerCode.count(),
  ]);
  return { codes, total, page, pages: Math.ceil(total / limit) };
}

async function validateInfluencerCode(code, buyerUserId) {
  const record = await prisma.influencerCode.findUnique({ where: { code: code.toUpperCase() } });
  if (!record || !record.isActive) return { valid: false, reason: 'not_found' };

  // Self-use guard
  if (buyerUserId && record.ownerUserId === buyerUserId) {
    return { valid: false, reason: 'self_use' };
  }

  // Monthly limit check
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const monthCount = await prisma.influencerCodeUsage.count({
    where: {
      codeId: record.id,
      rewardStatus: { not: 'CANCELLED' },
      createdAt: { gte: startOfMonth },
    },
  });
  if (monthCount >= record.monthlyLimit) return { valid: false, reason: 'monthly_limit' };

  return {
    valid: true,
    codeId: record.id,
    ownerUserId: record.ownerUserId,
    discountPct: record.discountPct,
    commissionPct: record.commissionPct,
    label: record.label,
  };
}

async function onInfluencerCodeUsed({ code, buyerUserId, orderId, orderAmount, clientIp, clientId }) {
  const validation = await validateInfluencerCode(code, buyerUserId);
  if (!validation.valid) {
    logger.warn('[Influencer] Code rejected at usage time', { code, reason: validation.reason, orderId });
    return;
  }

  const existing = await prisma.influencerCodeUsage.findUnique({ where: { orderId } });
  if (existing) return;

  const commissionAmount = (Number(orderAmount) * validation.commissionPct) / 100;
  const discountAmount = (Number(orderAmount) * validation.discountPct) / 100;

  const usage = await prisma.influencerCodeUsage.create({
    data: {
      id: uuidv4(),
      codeId: validation.codeId,
      buyerUserId: buyerUserId || null,
      orderId,
      orderAmount,
      commissionAmount,
      discountAmount,
      rewardStatus: 'PENDING',
      clientIp: clientIp || null,
      clientId: clientId || null,
    },
  });

  // IP / clientId fraud clustering check
  await _checkInfluencerFraud(usage, validation.codeId);

  logger.info('[Influencer] Usage recorded', { code, orderId, commissionAmount });
}

async function _checkInfluencerFraud(newUsage, codeId) {
  const windowStart = new Date(Date.now() - FRAUD_WINDOW_MS);

  for (const field of ['clientIp', 'clientId']) {
    const value = newUsage[field];
    if (!value) continue;

    const peers = await prisma.influencerCodeUsage.findMany({
      where: {
        codeId,
        [field]: value,
        rewardStatus: { not: 'CANCELLED' },
        createdAt: { gte: windowStart },
        id: { not: newUsage.id },
      },
    });

    if (peers.length >= FRAUD_THRESHOLD - 1) {
      const frozenUntil = new Date(Date.now() + FREEZE_DAYS * 24 * 60 * 60 * 1000);
      const frozenReason = `Suspicious: ${peers.length + 1} orders from same ${field} in 48h`;

      const idsToFreeze = [...peers.map((p) => p.id), newUsage.id];
      await prisma.influencerCodeUsage.updateMany({
        where: { id: { in: idsToFreeze }, rewardStatus: 'PENDING' },
        data: { rewardStatus: 'FROZEN', frozenUntil, frozenReason },
      });

      logger.warn('[Influencer] Fraud freeze applied', {
        codeId,
        field,
        value,
        count: idsToFreeze.length,
        frozenUntil,
      });
      return;
    }
  }
}

async function listUsages({ page = 1, limit = 20, status, codeId } = {}) {
  const where = {};
  if (status) where.rewardStatus = status;
  if (codeId) where.codeId = codeId;

  const [usages, total] = await Promise.all([
    prisma.influencerCodeUsage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { code: { select: { code: true, label: true } } },
    }),
    prisma.influencerCodeUsage.count({ where }),
  ]);

  return {
    usages: usages.map((u) => ({
      ...u,
      orderAmount: Number(u.orderAmount),
      commissionAmount: Number(u.commissionAmount),
      discountAmount: Number(u.discountAmount),
    })),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

async function markUsagePaid(usageId) {
  const usage = await prisma.influencerCodeUsage.findUnique({ where: { id: usageId } });
  if (!usage) throw new Error('Usage not found');
  if (usage.rewardStatus !== 'PENDING') {
    throw new Error(`Cannot mark as paid: status is ${usage.rewardStatus}`);
  }
  return prisma.influencerCodeUsage.update({
    where: { id: usageId },
    data: { rewardStatus: 'PAID', paidAt: new Date() },
  });
}

module.exports = {
  createCode,
  updateCode,
  listCodes,
  validateInfluencerCode,
  onInfluencerCodeUsed,
  listUsages,
  markUsagePaid,
};
