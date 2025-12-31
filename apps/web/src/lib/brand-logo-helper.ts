/**
 * Brand Logo URL Helper
* 根据环境返回正确的品牌logo URL
 * - 生产环境：使用前端服务URL访问存储在GCP的logo
 * - 开发环境：使用相对路径
 * - 品牌logo都是从Custom Ink爬取，存储在GCP前端服务的public目录
 */

/**
 * 获取品牌logo的完整URL
* 品牌logo存储在GCP前端服务，使用相对路径即可（浏览器会自动解析）
 * 如果需要完整URL（例如在SSR或API响应中），可以使用此函数
 */
export function getBrandLogoUrl(relativePath: string): string {
  // 如果已经是完整URL（包含http://或https://），直接返回
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  // 确保路径以 / 开头
  const normalizedPath = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  // 客户端环境：在浏览器中使用相对路径即可（Next.js会自动解析为当前域名）
  // 生产环境时，相对路径会自动指向GCP前端服务
  if (typeof window !== 'undefined') {
    // 浏览器环境：使用相对路径，会自动解析为当前域名（前端服务）
    return normalizedPath;
  }

  // SSR环境：如果需要完整URL，使用环境变量或默认的前端URL
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    const frontendUrl = process.env.NEXT_PUBLIC_FRONTEND_URL || 
                       process.env.FRONTEND_URL ||
                       'https://print-main-frontend-234065158862.us-central1.run.app';
    return `${frontendUrl.replace(/\/$/, '')}${normalizedPath}`;
  }

  // 开发环境SSR：使用相对路径
  return normalizedPath;
}

/**
 * 获取所有品牌logo的URL（批量处理）
 */
export function getBrandLogosWithUrls(brandLogos: Array<{ id: string; name: string; src: string }>) {
  return brandLogos.map(brand => ({
    ...brand,
    url: getBrandLogoUrl(brand.src),
  }));
}

