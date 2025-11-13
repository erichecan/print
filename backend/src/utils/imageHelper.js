/**
 * Image Helper Utilities
 * [2025-01-27 14:55:00] Helpers for generating optimized image URLs
 */

const DEFAULT_WIDTH = 800;
const DEFAULT_QUALITY = 85;

/**
 * Optimize image URL by appending width/quality query params when supported.
 * Supports common CDN patterns (e.g. Cloudflare Image Resizing, Imgix, AWS CloudFront signed params).
 * Falls back to original URL if transformation not applicable.
 *
 * @param {string | null | undefined} url - Original image URL
 * @param {{ width?: number, quality?: number }} [options] - Optimization options
 * @returns {string | null}
 */
function optimizeImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') {
    return null;
  }

  const width = Math.max(1, Math.min(options.width || DEFAULT_WIDTH, 2000));
  const quality = Math.max(1, Math.min(options.quality || DEFAULT_QUALITY, 100));

  try {
    const lowerUrl = url.toLowerCase();
    const isCdnUrl =
      lowerUrl.includes('cloudfront') ||
      lowerUrl.includes('cloudflare') ||
      lowerUrl.includes('imgix') ||
      lowerUrl.includes('akamai') ||
      lowerUrl.includes('fastly');

    if (!isCdnUrl) {
      return url;
    }

    const parsed = new URL(url);

    // Avoid overwriting existing width/quality params if they already exist
    if (!parsed.searchParams.has('width')) {
      parsed.searchParams.set('width', String(width));
    }

    if (!parsed.searchParams.has('quality')) {
      parsed.searchParams.set('quality', String(quality));
    }

    return parsed.toString();
  } catch (error) {
    // If URL parsing fails, return original URL to avoid breaking image rendering
    return url;
  }
}

module.exports = {
  optimizeImageUrl,
};
