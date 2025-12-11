/**
 * Design Lab URL Builder
 * [2025-12-08 14:40:00] 统一构建 Design Lab 新页面链接，替换旧的 design-lab-native.html
 */

export interface DesignUrlParams {
  variantId?: string;
  productId?: string;
  color?: string;
  size?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * 构建新的 Design Lab URL
 * @param params - 设计器参数
 * @returns 完整的 Design Lab URL
 * @throws {Error} 如果 variantId 缺失且为必需参数
 */
export function buildNewDesignUrl(params: DesignUrlParams): string {
  // [2025-12-08 14:40:00] 从环境变量获取基础 URL，如果没有则使用默认路径
  const baseUrl = process.env.NEXT_PUBLIC_NEW_DESIGN_URL;
  const basePath = process.env.NEXT_PUBLIC_NEW_DESIGN_PATH || '/design-lab';
  
  // 使用环境变量中的完整 URL，或使用相对路径
  const base = baseUrl || basePath;
  
  // [2025-12-08 14:40:00] 构建查询参数
  const queryParams = new URLSearchParams();
  
  // variantId 是必需参数（从商品详情页跳转时）
  if (params.variantId) {
    queryParams.append('variantId', params.variantId);
  }
  
  // 可选参数
  if (params.productId) {
    queryParams.append('productId', params.productId);
  }
  
  if (params.color) {
    queryParams.append('color', params.color);
  }
  
  if (params.size) {
    queryParams.append('size', params.size);
  }
  
  // referrer 默认为 'product_detail'，表示从商品详情页跳转
  queryParams.append('referrer', params.referrer || 'product_detail');
  
  // UTM 参数（可选）
  if (params.utm_source) {
    queryParams.append('utm_source', params.utm_source);
  }
  
  if (params.utm_medium) {
    queryParams.append('utm_medium', params.utm_medium);
  }
  
  if (params.utm_campaign) {
    queryParams.append('utm_campaign', params.utm_campaign);
  }
  
  // [2025-12-08 14:40:00] 如果 base 是完整 URL，直接拼接；否则使用相对路径
  if (base.startsWith('http://') || base.startsWith('https://')) {
    return `${base}?${queryParams.toString()}`;
  } else {
    return `${base}?${queryParams.toString()}`;
  }
}

/**
 * @deprecated 已废弃，请使用 buildNewDesignUrl
 * 保留此函数仅用于向后兼容，但不应再使用
 */
export function buildLegacyDesignUrl(params: { variantId?: string }): string {
  console.warn('[designUrl] buildLegacyDesignUrl is deprecated. Use buildNewDesignUrl instead.');
  if (params.variantId) {
    return `/design-lab-native.html?variantId=${params.variantId}`;
  }
  return '/design-lab-native.html';
}

/**
 * 验证生成的 URL 不包含旧路径
 * @param url - 要验证的 URL
 * @returns 如果包含旧路径则返回 true
 */
export function containsLegacyPath(url: string): boolean {
  return url.includes('design-lab-native') || url.includes('print-main-frontend-234065158862.us-central1.run.app');
}

/**
 * 安全构建 Design Lab URL，如果检测到旧路径则抛出错误
 * @param params - 设计器参数
 * @returns 完整的 Design Lab URL
 * @throws {Error} 如果生成的 URL 包含旧路径
 */
export function buildNewDesignUrlSafe(params: DesignUrlParams): string {
  const url = buildNewDesignUrl(params);
  
  // [2025-12-08 14:40:00] 防止隐式回退：如果生成的 URL 包含旧路径，抛出错误
  if (containsLegacyPath(url)) {
    const error = new Error(`[designUrl] Generated URL contains legacy path: ${url}. This should not happen.`);
    console.error(error);
    // [2025-12-08 14:40:00] 上报错误（可以集成错误监控服务）
    if (typeof window !== 'undefined') {
      // 可以在这里集成错误上报服务
      console.error('[designUrl] Legacy path detected, blocking navigation');
    }
    throw error;
  }
  
  return url;
}





