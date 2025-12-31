/**
 * Product upload helpers
* Utilities for handling product image uploads
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

// Ensure the product upload directory exists on disk
const ensureProductUploadRoot = () => {
  if (!fs.existsSync(PRODUCT_UPLOAD_DIR)) {
    fs.mkdirSync(PRODUCT_UPLOAD_DIR, { recursive: true });
  }
  return PRODUCT_UPLOAD_DIR;
};

// Resolve allowed image extensions from environment
const getAllowedImageExtensions = () =>
  parseEnvExtensions(process.env.PRODUCT_IMAGE_ALLOWED_EXTENSIONS);

// Validate that the uploaded file has an allowed image extension
const isImageExtensionAllowed = (fileName) => {
  const lower = fileName?.toString().toLowerCase() || '';
  return getAllowedImageExtensions().some((ext) => lower.endsWith(ext));
};

// Build the storage key (relative path) for persisted assets
const buildStorageKey = (fileName) => path.join('products', fileName).replace(/\\/g, '/');

// Construct the public URL served from express static middleware
// 支持返回完整的后端服务器URL，以便Next.js Image组件可以访问
const buildPublicUrl = (storageKey, req = null) => {
  const relativeUrl = `${UPLOADS_PUBLIC_PREFIX}/${storageKey}`;
  
// 如果提供了请求对象，返回完整的后端服务器URL
  if (req) {
    const protocol = req.protocol || 'http';
    const host = req.get('host') || 'localhost:3001';
    return `${protocol}://${host}${relativeUrl}`;
  }
  
// 如果有环境变量配置的后端URL，使用它
  const backendUrl = process.env.BACKEND_URL || process.env.API_BASE_URL || process.env.FRONTEND_URL;
  if (backendUrl) {
    try {
      const url = new URL(backendUrl);
      // 如果后端URL包含 /api，去掉它（因为图片服务在根路径）
      const baseUrl = backendUrl.replace(/\/api\/?$/, '');
      return `${baseUrl}${relativeUrl}`;
    } catch {
      // URL解析失败，返回相对路径
    }
  }
  
// 默认返回完整的本地开发URL
  const defaultHost = process.env.PORT ? `localhost:${process.env.PORT}` : 'localhost:3001';
  return `http://${defaultHost}${relativeUrl}`;
};

// Translate a public asset URL back to its storage key
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
