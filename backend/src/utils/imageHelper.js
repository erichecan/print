/**
 * Image Helper Utilities
 * [2025-01-27 14:55:00] Helpers for generating optimized image URLs
 */

const DEFAULT_WIDTH = 800;
const DEFAULT_QUALITY = 85;

/**
 * [2025-01-27 16:15:00] 将相对路径转换为完整的后端服务器URL
 * [2025-01-27 17:10:00] 智能处理：自动检测环境，本地开发使用 localhost:3001，生产环境使用配置的 URL
 * [2025-01-28 23:05:00] 修复：对于 /assets/ 路径（前端静态资源），保持相对路径或使用前端服务 URL
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

  // [2025-12-01 22:15:00] 如果已经是完整的 URL（http:// 或 https://），检查是否是 GCS URL
  // 如果是 GCS URL，直接返回（无需转换）
  if (url.startsWith('http://') || url.startsWith('https://')) {
    // [2025-12-01 22:15:00] GCS URL 直接返回，无需处理
    if (url.includes('storage.googleapis.com') || url.includes('.storage.googleapis.com')) {
      return url;
    }
    return url;
  }

  // [2025-12-01 22:15:00] 对于前端静态资源路径（/assets/），优先检查是否已迁移到 GCS
  // 如果已迁移，数据库中的 URL 应该已经是完整的 GCS URL，这里保持原样
  if (url.startsWith('/assets/')) {
    // [2025-12-01 22:15:00] 如果配置了 GCS，且 URL 可能是旧的静态资源路径，可以考虑映射
    // 但迁移后数据库中应该已经是 GCS URL，所以这里保持向后兼容
    const isProduction = process.env.NODE_ENV === 'production';
    
    // 生产环境：使用前端服务 URL（向后兼容，迁移后应该不需要）
    if (isProduction) {
      const frontendUrl = process.env.FRONTEND_URL;
      if (frontendUrl) {
        // 确保 URL 格式正确（去除末尾的斜杠）
        const baseUrl = frontendUrl.replace(/\/$/, '');
        return `${baseUrl}${url}`;
      }
    }
    
    // 本地开发或没有配置 FRONTEND_URL：保持相对路径，让前端自己处理
    // Next.js 会自动处理 public 目录下的文件
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
    const isGcsUrl = lowerUrl.includes('storage.googleapis.com');
    
    // [2025-12-03 04:00:00] 对于 GCS URL，不添加查询参数
    // GCS 不支持 width/quality 查询参数进行图片优化
    // Next.js Image 优化器会处理这些参数，所以直接返回规范化后的 URL
    if (isGcsUrl) {
      return normalizedUrl;
    }
    
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
