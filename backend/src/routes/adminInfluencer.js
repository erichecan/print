const express = require('express');
const router = express.Router();
const { requireAdmin } = require('../middleware/auth');
const {
  createCode,
  updateCode,
  listCodes,
  listUsages,
  markUsagePaid,
} = require('../plugins/referral/influencerService');

router.use(requireAdmin);

// GET /api/admin/influencer/codes
router.get('/codes', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    res.json(await listCodes({ page: Number(page), limit: Number(limit) }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/influencer/codes
router.post('/codes', async (req, res) => {
  try {
    const { code, ownerUserId, label, discountPct, commissionPct, monthlyLimit } = req.body;
    res.status(201).json(await createCode({ code, ownerUserId, label, discountPct, commissionPct, monthlyLimit }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PATCH /api/admin/influencer/codes/:id
router.patch('/codes/:id', async (req, res) => {
  try {
    const { label, discountPct, commissionPct, monthlyLimit, isActive } = req.body;
    res.json(await updateCode(req.params.id, { label, discountPct, commissionPct, monthlyLimit, isActive }));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// GET /api/admin/influencer/usages?status=FROZEN&codeId=xxx
router.get('/usages', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, codeId } = req.query;
    res.json(await listUsages({ page: Number(page), limit: Number(limit), status, codeId }));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/influencer/usages/:id/paid
router.put('/usages/:id/paid', async (req, res) => {
  try {
    res.json(await markUsagePaid(req.params.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
