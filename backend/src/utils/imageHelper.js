/**
 * Image Helper Utilities
 * [2025-01-27 14:55:00] Helpers for generating optimized image URLs
 */

const DEFAULT_WIDTH = 800;
const DEFAULT_QUALITY = 85;

/**
 * [2025-01-27 16:15:00] 将相对路径转换为完整的后端服务器URL
 * @param {string} url - 图片URL（可能是相对路径或完整URL）
 * @param {Object} req - Express请求对象（可选）
 * @returns {string} 完整的图片URL
 */
function normalizeImageUrl(url, req = null) {
  if (!url || typeof url !== 'string') {
    return url;
  }

  // [2025-01-27 16:15:00] 如果已经是完整URL（http:// 或 https://），直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // [2025-01-27 16:15:00] 如果是相对路径（以 / 开头），转换为完整的后端服务器URL
  if (url.startsWith('/')) {
    if (req) {
      const protocol = req.protocol || 'http';
      const host = req.get('host') || 'localhost:3001';
      return `${protocol}://${host}${url}`;
    }

    // [2025-01-27 16:15:00] 从环境变量获取后端URL
    const backendUrl = process.env.BACKEND_URL || process.env.API_BASE_URL || process.env.FRONTEND_URL;
    if (backendUrl) {
      try {
        const baseUrl = backendUrl.replace(/\/api\/?$/, '');
        return `${baseUrl}${url}`;
      } catch {
        // URL解析失败，使用默认值
      }
    }

    // [2025-01-27 16:15:00] 默认使用本地开发服务器
    const defaultHost = process.env.PORT ? `localhost:${process.env.PORT}` : 'localhost:3001';
    return `http://${defaultHost}${url}`;
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
