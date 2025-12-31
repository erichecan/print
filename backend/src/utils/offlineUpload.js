// Shared helpers for offline order uploads
const path = require('path');
const fs = require('fs');

const OFFLINE_UPLOAD_ROOT = path.join(__dirname, '../../uploads/offline-orders');

const DEFAULT_ALLOWED_EXTENSIONS = [
  '.ai',
  '.eps',
  '.svg',
  '.pdf',
  '.png',
  '.jpg',
  '.jpeg',
  '.psd'
];

const parseListEnv = (value, fallback) => {
  if (!value) return fallback;
  return value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
};

const ensureOfflineUploadRoot = () => {
  if (!fs.existsSync(OFFLINE_UPLOAD_ROOT)) {
    fs.mkdirSync(OFFLINE_UPLOAD_ROOT, { recursive: true });
  }
  return OFFLINE_UPLOAD_ROOT;
};

const getAllowedExtensions = () =>
  parseListEnv(process.env.OFFLINE_ORDER_ALLOWED_EXTENSIONS, DEFAULT_ALLOWED_EXTENSIONS);

const isExtensionAllowed = (fileName) => {
  const lower = fileName?.toString().toLowerCase() || '';
  return getAllowedExtensions().some((ext) => lower.endsWith(ext));
};

module.exports = {
  OFFLINE_UPLOAD_ROOT,
  DEFAULT_ALLOWED_EXTENSIONS,
  ensureOfflineUploadRoot,
  getAllowedExtensions,
  isExtensionAllowed
};

