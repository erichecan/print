const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const {
  getUserStats,
  validateCode,
  ensureUserCode,
} = require('../plugins/referral/referralService');

// GET /api/referral/me — user's referral dashboard data
router.get('/me', authenticate, async (req, res) => {
  try {
    const stats = await getUserStats(req.user.id);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/referral/campaign — public, returns current campaign config for the landing page
router.get('/campaign', async (req, res) => {
  try {
    const campaign = await getCampaign();
    res.json({
      isActive: campaign.isActive,
      cap: campaign.cap,
      tierAmounts: [
        Number(campaign.tier1Amount),
        Number(campaign.tier2Amount),
        Number(campaign.tier3Amount),
      ],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/referral/validate/:code — public, check if a code is valid before checkout
router.get('/validate/:code', async (req, res) => {
  try {
    const result = await validateCode(req.params.code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
