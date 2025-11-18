/**
 * Image Helper Utilities
 * [2025-01-27 14:55:00] Helpers for generating optimized image URLs
 */

const DEFAULT_WIDTH = 800;
const DEFAULT_QUALITY = 85;

/**
 * [2025-01-27 16:15:00] 将相对路径转换为完整的后端服务器URL
 * [2025-01-27 17:10:00] 智能处理：自动检测环境，本地开发使用 localhost:3001，生产环境使用配置的 URL
 * @param {string} url - 图片URL（可能是相对路径或完整URL）
 * @param {Object} req - Express请求对象（可选）
 * @returns {string} 完整的图片URL
 */
function normalizeImageUrl(url, req = null) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // [2025-01-27 17:10:00] 如果包含 localhost，根据环境决定是否替换
  // 生产环境：替换 localhost 为实际的后端 URL
  // 本地开发：保持 localhost
  if (url.includes('localhost')) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction && req) {
      // 生产环境：使用请求的实际 host
      const protocol = req.protocol || 'https';
      const host = req.get('host') || process.env.BACKEND_URL?.replace(/^https?:\/\//, '') || 'print-mnmz.onrender.com';
      return url.replace(/http:\/\/localhost:\d+/, `${protocol}://${host}`);
    }
    // 本地开发：保持 localhost，但确保端口正确
    if (!isProduction) {
      const port = process.env.PORT || '3001';
      return url.replace(/http:\/\/localhost:\d+/, `http://localhost:${port}`);
    }
  }

  // [2025-01-27 16:15:00] 如果已经是完整URL（http:// 或 https://），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // [2025-01-27 16:15:00] 如果是相对路径（以 / 开头），转换为完整的后端服务器URL
  if (url.startsWith('/')) {
    if (req) {
      // [2025-01-27 17:10:00] 优先使用请求的实际 host（自动适配环境）
      const protocol = req.protocol || (process.env.NODE_ENV === 'production' ? 'https' : 'http');
      const host = req.get('host') || (process.env.NODE_ENV === 'production' 
        ? (process.env.BACKEND_URL?.replace(/^https?:\/\//, '') || 'print-mnmz.onrender.com')
        : `localhost:${process.env.PORT || '3001'}`);
      return `${protocol}://${host}${url}`;
    }

    // [2025-01-27 17:10:00] 从环境变量获取后端URL（生产环境）
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      const backendUrl = process.env.BACKEND_URL || process.env.API_BASE_URL;
      if (backendUrl) {
        try {
          const baseUrl = backendUrl.replace(/\/api\/?$/, '');
          return `${baseUrl}${url}`;
        } catch {
          // URL解析失败，使用默认值
        }
      }
      // 生产环境默认 URL
      return `https://print-mnmz.onrender.com${url}`;
    }

    // [2025-01-27 17:10:00] 本地开发：使用 localhost 和配置的端口
    const port = process.env.PORT || '3001';
    return `http://localhost:${port}${url}`;
  }

  return url;
}

/**
 * Optimize image URL by appending width/quality query params when supported.
 * Supports common CDN patterns (e.g. Cloudflare Image Resizing, Imgix, AWS CloudFront signed params).
 * Falls back to original URL if transformation not applicable.
 *
 * @param {string | null | undefined} url - Original image URL
 * @param {{ width?: number, quality?: number, req?: Object }} [options] - Optimization options
 * @returns {string | null}
 */
function optimizeImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  // [2025-01-27 16:15:00] 首先将相对路径转换为完整URL
  const normalizedUrl = normalizeImageUrl(url, options.req);

  const width = Math.max(1, Math.min(options.width || DEFAULT_WIDTH, 2000));
  const quality = Math.max(1, Math.min(options.quality || DEFAULT_QUALITY, 100));

  try {
    const lowerUrl = normalizedUrl.toLowerCase();
    const isCdnUrl =
      lowerUrl.includes('cloudfront') ||
      lowerUrl.includes('cloudflare') ||
      lowerUrl.includes('imgix') ||
      lowerUrl.includes('akamai') ||
      lowerUrl.includes('fastly');

    // [2025-01-27 16:15:00] 如果不是CDN URL，直接返回规范化后的URL（不进行优化）
    if (!isCdnUrl) {
      return normalizedUrl;
    }

    const parsed = new URL(normalizedUrl);

    // Avoid overwriting existing width/quality params if they already exist
    if (!parsed.searchParams.has('width')) {
      parsed.searchParams.set('width', String(width));
    }

    if (!parsed.searchParams.has('quality')) {
      parsed.searchParams.set('quality', String(quality));
    }

    return parsed.toString();
  } catch (error) {
    // If URL parsing fails, return normalized URL to avoid breaking image rendering
    return normalizedUrl;
  }
}

module.exports = {
  optimizeImageUrl,
  normalizeImageUrl,
};
