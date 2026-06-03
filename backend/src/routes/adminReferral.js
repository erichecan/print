const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  getCampaign,
  updateCampaign,
  getAdminStats,
  listLinks,
  markRewardPaid,
} = require('../plugins/referral/referralService');

router.use(requireAdmin);

// GET /api/admin/referral/campaign
router.get('/campaign', async (req, res) => {
  try {
    const campaign = await getCampaign();
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/referral/campaign
router.put('/campaign', async (req, res) => {
  try {
    const { isActive, cap, tier1Amount, tier2Amount, tier3Amount } = req.body;
    const campaign = await updateCampaign({ isActive, cap, tier1Amount, tier2Amount, tier3Amount });
    res.json(campaign);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/referral/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await getAdminStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/referral/links?page=1&limit=20&status=PENDING
router.get('/links', async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const data = await listLinks({ page: Number(page), limit: Number(limit), status });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/referral/rewards/:id/paid
router.put('/rewards/:id/paid', async (req, res) => {
  try {
    const link = await markRewardPaid(req.params.id);
    res.json(link);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
