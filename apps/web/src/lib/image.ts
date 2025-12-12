/**
 * Image Utility Functions
 * [2025-01-27 19:20:00] 图片 URL 处理和代理工具函数
 */

/**
 * 将远程图片 URL 转换为代理 URL（如果需要）
 * [2025-01-27 19:20:00]
 */
export function asProxy(src: string): string {
  // [2025-01-27 19:20:00] 如果启用了图片代理，且是外部 URL，则使用代理
  if (process.env.NEXT_PUBLIC_IMAGE_PROXY === 'on' && /^https?:\/\//.test(src)) {
    // [2025-01-27 19:20:00] 检查是否是本地路径或已代理的 URL
    if (src.startsWith('/') || src.includes('/api/image-proxy')) {
      return src;
    }
    return `/api/image-proxy?src=${encodeURIComponent(src)}`;
  }
  return src;
}

/**
 * 检查图片 URL 是否需要代理
 * [2025-01-27 19:20:00]
 */
export function needsProxy(src: string): boolean {
  if (!/^https?:\/\//.test(src)) {
    return false; // 本地路径不需要代理
  }
  
  // [2025-01-27 19:20:00] 检查是否是已代理的 URL
  if (src.includes('/api/image-proxy')) {
    return false;
  }
  
  // [2025-01-27 19:20:00] 如果启用了代理，外部 URL 需要代理
  return process.env.NEXT_PUBLIC_IMAGE_PROXY === 'on';
}

/**
 * 获取图片占位符 URL
 * [2025-01-27 19:20:00]
 */
export function getPlaceholderImage(width: number = 400, height: number = 400): string {
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"%3E%3Crect fill="%23f3f4f6" width="${width}" height="${height}"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="16" fill="%239ca3af"%3EImage not available%3C/text%3E%3C/svg%3E`;
}
