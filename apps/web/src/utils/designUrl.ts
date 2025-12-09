/**
 * Design Lab URL Builder
 * [2025-12-08 14:40:00] 统一构建 Design Lab 新页面链接，替换旧的 design-lab-native.html
 */
'use client';

export interface DesignUrlParams {
  variantId: string;
  productId?: string;
  color?: string;
  size?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

/**
 * 构建 Design Lab 新页面 URL
 * @param params - 设计器参数
 * @returns 完整的 Design Lab URL
 * @throws {Error} 如果缺少 variantId
 */
export function buildNewDesignUrl(params: DesignUrlParams): string {
  // [2025-12-08 14:40:00] 验证必需参数
  if (!params?.variantId) {
    throw new Error('Missing required parameter: variantId');
  }

  // [2025-12-08 14:40:00] 优先使用环境变量，否则使用默认路径
  const BASE_URL = process.env.NEXT_PUBLIC_NEW_DESIGN_URL;
  const BASE_PATH = '/design-lab'; // 新 Design Lab 路径
  const base = BASE_URL || BASE_PATH;

  // [2025-12-08 14:40:00] 使用 URLSearchParams 构建查询参数
  const queryParams = new URLSearchParams({
    variantId: params.variantId,
    referrer: params.referrer || 'product_detail',
  });

  // [2025-12-08 14:40:00] 添加可选参数
  if (params.productId) {
    queryParams.append('productId', params.productId);
  }
  if (params.color) {
    queryParams.append('color', params.color);
  }
  if (params.size) {
    queryParams.append('size', params.size);
  }
  if (params.utm_source) {
    queryParams.append('utm_source', params.utm_source);
  }
  if (params.utm_medium) {
    queryParams.append('utm_medium', params.utm_medium);
  }
  if (params.utm_campaign) {
    queryParams.append('utm_campaign', params.utm_campaign);
  }

  // [2025-12-08 14:40:00] 构建完整 URL
  const url = `${base}?${queryParams.toString()}`;

  // [2025-12-08 14:40:00] 安全检查：如果生成的 URL 包含旧路径，抛出错误
  if (url.includes('design-lab-native')) {
    const error = new Error(`Generated URL contains legacy path: ${url}`);
    console.error('[buildNewDesignUrl] Security check failed:', error);
    // [2025-12-08 14:40:00] 埋点：记录错误
    if (typeof window !== 'undefined') {
      try {
        const { analytics } = require('@/lib/analytics');
        analytics.track('design_url_legacy_detected', {
          url,
          params,
        });
      } catch (e) {
        // 忽略 analytics 错误
      }
    }
    throw error;
  }

  return url;
}

/**
 * @deprecated 使用 buildNewDesignUrl 替代
 * 构建旧版 Design Lab 链接（已废弃，仅用于兼容）
 */
export function buildLegacyDesignUrl(variantId?: string): string {
  console.warn('[buildLegacyDesignUrl] This function is deprecated. Use buildNewDesignUrl instead.');
  if (variantId) {
    return `/design-lab-native.html?variantId=${variantId}`;
  }
  return '/design-lab-native.html';
}

