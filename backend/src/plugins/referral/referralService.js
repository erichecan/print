const { PrismaClient } = require('@prisma/client');
const { generateInviteCode } = require('./generateCode');
const logger = require('../../utils/logger');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

// ─── Campaign Config ─────────────────────────────────────────────────────────

async function getCampaign() {
  let campaign = await prisma.referralCampaign.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  if (!campaign) {
    campaign = await prisma.referralCampaign.create({
      data: { id: uuidv4(), name: 'default', isActive: true },
    });
    logger.info('[Referral] Auto-created default campaign');
  }
  return campaign;
}

async function updateCampaign(data) {
  const campaign = await getCampaign();
  return prisma.referralCampaign.update({
    where: { id: campaign.id },
    data: {
      isActive: data.isActive ?? campaign.isActive,
      cap: data.cap ?? campaign.cap,
      tier1Amount: data.tier1Amount ?? campaign.tier1Amount,
      tier2Amount: data.tier2Amount ?? campaign.tier2Amount,
      tier3Amount: data.tier3Amount ?? campaign.tier3Amount,
    },
  });
}

// ─── Code Registration ────────────────────────────────────────────────────────

async function ensureUserCode(userId) {
  const code = generateInviteCode(userId);
  await prisma.referralUserCode.upsert({
    where: { userId },
    update: {},
    create: { id: uuidv4(), userId, code },
  });
  return code;
}

async function findUserByCode(code) {
  const entry = await prisma.referralUserCode.findUnique({ where: { code } });
  return entry ? entry.userId : null;
}

async function validateCode(code) {
  const promoterUserId = await findUserByCode(code);
  if (!promoterUserId) return { valid: false };

  const campaign = await getCampaign();
  if (!campaign.isActive) return { valid: false, reason: 'campaign_inactive' };

  const completedCount = await prisma.referralLink.count({
    where: { promoterUserId, rewardStatus: { in: ['PENDING', 'PAID'] } },
  });

  if (completedCount >= campaign.cap) return { valid: false, reason: 'cap_reached' };

  return { valid: true, promoterUserId };
}

// ─── User Stats ───────────────────────────────────────────────────────────────

async function getUserStats(userId) {
  const campaign = await getCampaign();
  const code = await ensureUserCode(userId);

  const links = await prisma.referralLink.findMany({
    where: { promoterUserId: userId },
    orderBy: { createdAt: 'desc' },
  });

  const referralCount = links.filter((l) => !['CANCELLED', 'FROZEN'].includes(l.rewardStatus)).length;
  const walletBalance = links.reduce((sum, l) => {
    if (l.rewardStatus === 'PENDING' || l.rewardStatus === 'PAID') {
      return sum + Number(l.rewardAmount);
    }
    return sum;
  }, 0);

  const tierAmounts = [
    Number(campaign.tier1Amount),
    Number(campaign.tier2Amount),
    Number(campaign.tier3Amount),
  ];

  const transactions = links.map((l) => ({
    id: l.id,
    amount: Number(l.rewardAmount),
    tier: l.tier,
    status: l.rewardStatus,
    orderId: l.orderId,
    referredUserId: l.referredUserId,
    createdAt: l.createdAt,
    paidAt: l.paidAt,
  }));

  return {
    code,
    referralCount,
    walletBalance,
    tierAmounts,
    referralCap: campaign.cap,
    transactions,
    campaignActive: campaign.isActive,
  };
}

// ─── Anti-Fraud: IP / clientId clustering ────────────────────────────────────

const FRAUD_WINDOW_MS = 48 * 60 * 60 * 1000;
const FRAUD_THRESHOLD = 2;
const FREEZE_DAYS = 30;

async function _checkReferralFraud(newLink) {
  const windowStart = new Date(Date.now() - FRAUD_WINDOW_MS);

  for (const field of ['clientIp', 'clientId']) {
    const value = newLink[field];
    if (!value) continue;

    const peers = await prisma.referralLink.findMany({
      where: {
        promoterUserId: newLink.promoterUserId,
        [field]: value,
        rewardStatus: { not: 'CANCELLED' },
        createdAt: { gte: windowStart },
        id: { not: newLink.id },
      },
    });

    if (peers.length >= FRAUD_THRESHOLD - 1) {
      const frozenUntil = new Date(Date.now() + FREEZE_DAYS * 24 * 60 * 60 * 1000);
      const frozenReason = `Suspicious: ${peers.length + 1} referrals from same ${field} in 48h`;

      const idsToFreeze = [...peers.map((p) => p.id), newLink.id];
      await prisma.referralLink.updateMany({
        where: { id: { in: idsToFreeze }, rewardStatus: 'PENDING' },
        data: { rewardStatus: 'FROZEN', frozenUntil, frozenReason },
      });

      logger.warn('[Referral] Fraud freeze applied', {
        promoterUserId: newLink.promoterUserId,
        field,
        value,
        count: idsToFreeze.length,
        frozenUntil,
      });
      return;
    }
  }
}

// ─── Core Hook ────────────────────────────────────────────────────────────────

async function onOrderPaid(orderId, referralCode, referredUserId, { clientIp, clientId } = {}) {
  if (!referralCode || !referralCode.startsWith('PNG')) return;

  try {
    // Idempotency: skip if already processed
    const existing = await prisma.referralLink.findUnique({ where: { orderId } });
    if (existing) {
      logger.info('[Referral] Order already processed', { orderId });
      return;
    }

    const campaign = await getCampaign();
    if (!campaign.isActive) return;

    const promoterUserId = await findUserByCode(referralCode);
    if (!promoterUserId) {
      logger.warn('[Referral] Unknown code', { referralCode, orderId });
      return;
    }

    // Self-referral guard
    if (referredUserId && promoterUserId === referredUserId) {
      logger.warn('[Referral] Self-referral rejected', { userId: referredUserId });
      return;
    }

    // Check if referred user already used a referral code
    if (referredUserId) {
      const usedBefore = await prisma.referralLink.findFirst({
        where: { referredUserId, rewardStatus: { not: 'CANCELLED' } },
      });
      if (usedBefore) {
        logger.info('[Referral] Referred user already participated', { referredUserId });
        return;
      }
    }

    // Count completed referrals for promoter (cap check)
    const completedCount = await prisma.referralLink.count({
      where: { promoterUserId, rewardStatus: { not: 'CANCELLED' } },
    });

    if (completedCount >= campaign.cap) {
      logger.info('[Referral] Promoter cap reached', { promoterUserId, cap: campaign.cap });
      return;
    }

    const tierAmounts = [
      Number(campaign.tier1Amount),
      Number(campaign.tier2Amount),
      Number(campaign.tier3Amount),
    ];
    const tier = completedCount + 1;
    const rewardAmount = tierAmounts[completedCount];

    const newLink = await prisma.referralLink.create({
      data: {
        id: uuidv4(),
        promoterUserId,
        referredUserId: referredUserId || null,
        orderId,
        tier,
        rewardAmount,
        rewardStatus: 'PENDING',
        clientIp: clientIp || null,
        clientId: clientId || null,
      },
    });

    logger.info('[Referral] Reward created', { promoterUserId, tier, rewardAmount, orderId });

    // Async fraud check — never blocks order confirmation
    _checkReferralFraud(newLink).catch((err) =>
      logger.error('[Referral] Fraud check error', { orderId, error: err.message })
    );
  } catch (err) {
    logger.error('[Referral] onOrderPaid error', { orderId, error: err.message, stack: err.stack });
  }
}

// ─── Admin ────────────────────────────────────────────────────────────────────

async function getAdminStats() {
  const campaign = await getCampaign();
  const [totalLinks, totalPending, totalPaid] = await Promise.all([
    prisma.referralLink.count(),
    prisma.referralLink.count({ where: { rewardStatus: 'PENDING' } }),
    prisma.referralLink.count({ where: { rewardStatus: 'PAID' } }),
  ]);

  const pendingAmount = await prisma.referralLink.aggregate({
    where: { rewardStatus: 'PENDING' },
    _sum: { rewardAmount: true },
  });
  const paidAmount = await prisma.referralLink.aggregate({
    where: { rewardStatus: 'PAID' },
    _sum: { rewardAmount: true },
  });

  return {
    campaign,
    stats: {
      totalReferrals: totalLinks,
      pendingCount: totalPending,
      paidCount: totalPaid,
      pendingAmount: Number(pendingAmount._sum.rewardAmount || 0),
      paidAmount: Number(paidAmount._sum.rewardAmount || 0),
    },
  };
}

async function listLinks({ page = 1, limit = 20, status } = {}) {
  const where = status ? { rewardStatus: status } : {};
  const [links, total] = await Promise.all([
    prisma.referralLink.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.referralLink.count({ where }),
  ]);

  return {
    links: links.map((l) => ({ ...l, rewardAmount: Number(l.rewardAmount) })),
    total,
    page,
    pages: Math.ceil(total / limit),
  };
}

async function markRewardPaid(linkId) {
  const link = await prisma.referralLink.findUnique({ where: { id: linkId } });
  if (!link) throw new Error('Referral link not found');
  if (link.rewardStatus !== 'PENDING') throw new Error(`Cannot mark as paid: status is ${link.rewardStatus}`);

  return prisma.referralLink.update({
    where: { id: linkId },
    data: { rewardStatus: 'PAID', paidAt: new Date() },
  });
}

module.exports = {
  getCampaign,
  updateCampaign,
  ensureUserCode,
  validateCode,
  getUserStats,
  onOrderPaid,
  getAdminStats,
  listLinks,
  markRewardPaid,
};
