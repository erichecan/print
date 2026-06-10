const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const OpenAI = require('openai');
const { toFile } = require('openai');
const prisma = require('../lib/prisma');
const { authenticateOptional } = require('../middleware/auth');
const { uploadBufferToGcs, buildObjectPath } = require('../utils/gcsStorage');

const router = express.Router();

const MAX_INPUT_BYTES = 10 * 1024 * 1024; // 10MB raw upload (PNG conversion may shrink)
const MAX_PNG_BYTES = 5 * 1024 * 1024;    // 5MB after PNG conversion
const MAX_GUEST_USES = 1;
const MAX_USER_DAILY_USES = 5;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_INPUT_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
});

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  return (forwarded ? forwarded.split(',')[0] : req.ip || '').trim();
}

function ensureGuestToken(req, res) {
  let token = req.cookies?.bg_guest_token;
  if (!token) {
    token = uuidv4();
    res.cookie('bg_guest_token', token, {
      httpOnly: true,
      maxAge: 365 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  return token;
}

// GET /api/bg-remove/results
router.get('/results', authenticateOptional, async (req, res) => {
  try {
    const userId = req.user?.id;
    const guestToken = req.cookies?.bg_guest_token;

    const where = userId
      ? { userId, isProcessing: false, resultUrl: { not: '' } }
      : guestToken
        ? { guestToken, isProcessing: false, resultUrl: { not: '' } }
        : null;

    if (!where) return res.json({ results: [] });

    const records = await prisma.bgRemoveUsage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, resultUrl: true, createdAt: true },
    });

    res.json({ results: records });
  } catch (err) {
    console.error('[BgRemove] results error:', err);
    res.status(500).json({ error: 'Failed to fetch results' });
  }
});

// GET /api/bg-remove/usage
router.get('/usage', authenticateOptional, async (req, res) => {
  try {
    const userId = req.user?.id;

    if (userId) {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const used = await prisma.bgRemoveUsage.count({
        where: { userId, isProcessing: false, createdAt: { gte: startOfDay } },
      });
      return res.json({ used, limit: MAX_USER_DAILY_USES, remaining: Math.max(0, MAX_USER_DAILY_USES - used), isGuest: false });
    }

    const guestToken = req.cookies?.bg_guest_token;
    if (!guestToken) {
      return res.json({ used: 0, limit: MAX_GUEST_USES, remaining: MAX_GUEST_USES, isGuest: true });
    }

    const used = await prisma.bgRemoveUsage.count({
      where: { guestToken, isProcessing: false },
    });
    return res.json({ used, limit: MAX_GUEST_USES, remaining: Math.max(0, MAX_GUEST_USES - used), isGuest: true });
  } catch (err) {
    console.error('[BgRemove] usage error:', err);
    res.status(500).json({ error: 'Failed to check usage' });
  }
});

// POST /api/bg-remove
router.post('/', authenticateOptional, upload.single('image'), async (req, res) => {
  const userId = req.user?.id;
  const ip = getClientIp(req);
  const guestToken = ensureGuestToken(req, res);

  if (!req.file) {
    return res.status(400).json({ error: 'No image provided' });
  }

  // Check usage limits
  if (userId) {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const used = await prisma.bgRemoveUsage.count({
      where: { userId, isProcessing: false, createdAt: { gte: startOfDay } },
    });
    if (used >= MAX_USER_DAILY_USES) {
      return res.status(429).json({ error: `Daily limit reached (${MAX_USER_DAILY_USES}/day). Resets at midnight UTC.` });
    }
  } else {
    const used = await prisma.bgRemoveUsage.count({
      where: { guestToken, isProcessing: false },
    });
    if (used >= MAX_GUEST_USES) {
      return res.status(429).json({
        error: 'Guest limit reached. Sign up for free to get 5 uses per day.',
        requiresSignup: true,
      });
    }
  }

  // Convert to PNG, resize to max 1024px longest edge, enforce 5MB limit
  let pngBuffer;
  try {
    pngBuffer = await sharp(req.file.buffer)
      .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
      .png()
      .toBuffer();
  } catch (err) {
    return res.status(400).json({ error: 'Invalid or unsupported image format' });
  }

  if (pngBuffer.length > MAX_PNG_BYTES) {
    return res.status(400).json({
      error: `Image too large after conversion (${(pngBuffer.length / 1024 / 1024).toFixed(1)} MB). Please use an image under 5 MB.`,
    });
  }

  // Concurrent lock: create a pending record first
  const record = await prisma.bgRemoveUsage.create({
    data: {
      userId: userId || null,
      guestToken: userId ? null : guestToken,
      ipAddress: ip,
      isProcessing: true,
    },
  });

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

    const openai = new OpenAI({ apiKey });
    const imageFile = await toFile(pngBuffer, 'image.png', { type: 'image/png' });

    const response = await openai.images.edit({
      model: 'gpt-image-1',
      image: imageFile,
      prompt: 'Remove the background completely. Make the background fully transparent. Keep the main subject intact with clean, precise edges.',
      size: 'auto',
      quality: 'medium',
    });

    const b64 = response.data?.[0]?.b64_json;
    if (!b64) throw new Error('No image returned from OpenAI');

    const resultBuffer = Buffer.from(b64, 'base64');

    const folder = userId ? `users/${userId}` : `guests/${guestToken}`;
    const objectPath = buildObjectPath('bg-remove-results', [folder, `${Date.now()}-${record.id}.png`]);
    const resultUrl = await uploadBufferToGcs(resultBuffer, objectPath, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=86400',
    });

    await prisma.bgRemoveUsage.update({
      where: { id: record.id },
      data: { resultGcsKey: objectPath, resultUrl, isProcessing: false },
    });

    res.json({ url: resultUrl });
  } catch (err) {
    // Don't count failed attempts
    await prisma.bgRemoveUsage.delete({ where: { id: record.id } }).catch(() => {});
    console.error('[BgRemove] processing error:', err);
    res.status(500).json({ error: 'Failed to remove background. Please try again.' });
  }
});

module.exports = router;
