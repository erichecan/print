/**
 * Product upload helpers
 * [2025-01-27 14:58:00] Utilities for handling product image uploads
 */
const path = require('path');
const fs = require('fs');

const UPLOADS_PUBLIC_PREFIX = '/uploads';
const PRODUCT_UPLOAD_DIR = path.join(__dirname, '../../uploads/products');

const DEFAULT_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

const parseEnvExtensions = (rawValue) => {
  if (!rawValue) return DEFAULT_IMAGE_EXTENSIONS;
  return rawValue
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .map((item) => (item.startsWith('.') ? item : `.${item}`));
};

// [2025-01-27 14:58:00] Ensure the product upload directory exists on disk
const ensureProductUploadRoot = () => {
  if (!fs.existsSync(PRODUCT_UPLOAD_DIR)) {
    fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });
  }
  return PRODUCT_UPLOAD_DIR;
};

// [2025-01-27 14:58:00] Resolve allowed image extensions from environment
const getAllowedImageExtensions = () =>
  parseEnvExtensions(process.env.PRODUCT_IMAGE_ALLOWED_EXTENSIONS);

// [2025-01-27 14:58:00] Validate that the uploaded file has an allowed image extension
const isImageExtensionAllowed = (fileName) => {
  const lower = fileName?.toString().toLowerCase() || '';
  return getAllowedImageExtensions().some((ext) => lower.endsWith(ext));
};

// [2025-01-27 14:58:00] Build the storage key (relative path) for persisted assets
const buildStorageKey = (fileName) => path.join('products', fileName).replace(/\\/g, '/');

// [2025-01-27 14:58:00] Construct the public URL served from express static middleware
const buildPublicUrl = (storageKey) => `${UPLOADS_PUBLIC_PREFIX}/${storageKey}`;

// [2025-01-27 14:58:00] Translate a public asset URL back to its storage key
const extractStorageKeyFromUrl = (url) => {
  if (!url) return null;
  const normalized = url.startsWith('http') ? new URL(url).pathname : url;
  if (!normalized.startsWith(UPLOADS_PUBLIC_PREFIX)) {
    return null;
  }
  const relative = normalized
    .substring(UPLOADS_PUBLIC_PREFIX.length)
    .replace(/^\/+/, '')
    .replace(/\\/g, '/');
  return relative.length ? relative : null;
};

module.exports = {
  UPLOADS_PUBLIC_PREFIX,
  PRODUCT_UPLOAD_DIR,
  DEFAULT_IMAGE_EXTENSIONS,
  ensureProductUploadRoot,
  getAllowedImageExtensions,
  isImageExtensionAllowed,
  buildStorageKey,
  buildPublicUrl,
  extractStorageKeyFromUrl,
};
