const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const { authenticateOptional } = require('../middleware/auth');
const { uploadBufferToGcs, buildObjectPath } = require('../utils/gcsStorage');

const router = express.Router();

const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const RECENT_LIMIT = 20;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_INPUT_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

function getGuestToken(req) {
  return req.cookies?.bg_guest_token;
}

// GET /api/user-uploads/recent
router.get('/recent', authenticateOptional, async (req, res) => {
  try {
    const userId = req.user?.id;
    const guestToken = getGuestToken(req);

    const where = userId
      ? { userId }
      : guestToken
        ? { guestToken }
        : null;

    if (!where) return res.json({ uploads: [] });

    const records = await prisma.userUpload.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: RECENT_LIMIT,
      select: { id: true, url: true, createdAt: true },
    });

    res.json({ uploads: records });
  } catch (err) {
    console.error('[UserUploads] recent error:', err);
    res.status(500).json({ error: 'Failed to fetch recent uploads' });
  }
});

// POST /api/user-uploads/save
router.post('/save', authenticateOptional, upload.single('image'), async (req, res) => {
  try {
    const userId = req.user?.id;
    const guestToken = getGuestToken(req);

    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    // Convert to PNG, max 1024px longest edge
    let pngBuffer;
    try {
      pngBuffer = await sharp(req.file.buffer)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .png()
        .toBuffer();
    } catch {
      return res.status(400).json({ error: 'Invalid or unsupported image format' });
    }

    const folder = userId ? `users/${userId}` : `guests/${guestToken || uuidv4()}`;
    const objectPath = buildObjectPath('user-uploads', [folder, `${Date.now()}.png`]);
    const url = await uploadBufferToGcs(pngBuffer, objectPath, {
      contentType: 'image/png',
      cacheControl: 'public, max-age=86400',
    });

    const record = await prisma.userUpload.create({
      data: {
        userId: userId || null,
        guestToken: userId ? null : (guestToken || null),
        url,
        gcsKey: objectPath,
      },
    });

    res.json({ id: record.id, url });
  } catch (err) {
    console.error('[UserUploads] save error:', err);
    res.status(500).json({ error: 'Failed to save upload' });
  }
});

module.exports = router;
