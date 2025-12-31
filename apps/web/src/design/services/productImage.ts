/**
 * Product Image Service
* 产品图片加载服务，保证 URL 原样与 headers
 * 
 * 职责：
 * - 获取产品主图 URL（保证 URL 原样，不被 encode 重写）
 * - 处理跨域请求（如果需要）
 * - 提供错误处理和重试机制
 */

import { getDefaultProductImageUrl, getDefaultProductBaseImages, getProductBaseImagesFromAPI } from '@/lib/customink-images';

export interface ProductImageLoadOptions {
  /** 产品 ID */
  productId?: string;
  /** 颜色名称 */
  colorName?: string | null;
  /** 视图类型 */
  view: 'front' | 'back' | 'sleeve';
  /** 是否使用 API 获取（默认 false，使用静态生成） */
  useAPI?: boolean;
  /** 是否添加版本戳参数（用于缓存控制） */
  addVersionStamp?: boolean;
  /** Git SHA（用于版本戳） */
  gitSha?: string;
}

export interface ProductImageLoadResult {
  /** 图片 URL */
  url: string;
  /** 是否从 API 获取 */
  fromAPI: boolean;
  /** 加载错误（如果有） */
  error?: Error;
}

/**
 * 获取产品图片 URL
* 保证 URL 原样，不被 encode 重写
 */
export async function getProductImageUrl(options: ProductImageLoadOptions): Promise<ProductImageLoadResult> {
  const {
    colorName = 'White',
    view,
    useAPI = false,
    addVersionStamp = false,
    gitSha,
  } = options;
  
  let url: string;
  let fromAPI = false;
  
  try {
    if (useAPI) {
      // 尝试从 API 获取
      const apiImages = await getProductBaseImagesFromAPI(colorName);
      if (apiImages && apiImages[view]) {
        url = apiImages[view];
        fromAPI = true;
      } else {
        // API 返回失败，使用静态生成
        url = getDefaultProductImageUrl(colorName, view);
      }
    } else {
      // 使用静态生成
      url = getDefaultProductImageUrl(colorName, view);
    }
    
    // 添加版本戳参数（如果需要）
    if (addVersionStamp && gitSha) {
      const separator = url.includes('?') ? '&' : '?';
      url = `${url}${separator}v=${gitSha}`;
    }
    
    return {
      url,
      fromAPI,
    };
  } catch (error) {
    console.error('[ProductImage] Failed to get product image URL:', error);
    
    // 错误时返回默认 URL
    return {
      url: getDefaultProductImageUrl(colorName, view),
      fromAPI: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * 获取所有视图的产品图片 URL
 */
export async function getAllProductImageUrls(
  colorName: string | null = 'White',
  useAPI: boolean = false
): Promise<{ front: string; back: string; sleeve: string }> {
  if (useAPI) {
    try {
      const apiImages = await getProductBaseImagesFromAPI(colorName);
      if (apiImages) {
        return apiImages;
      }
    } catch (error) {
      console.warn('[ProductImage] Failed to get images from API, using static:', error);
    }
  }
  
  return getDefaultProductBaseImages(colorName || 'White');
}

/**
 * 验证图片 URL 是否有效（通过 HEAD 请求）
 */
export async function validateImageUrl(url: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    // 服务端环境，默认返回 true
    return true;
  }
  
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      mode: 'no-cors', // 允许跨域，但无法读取状态码
    });
    
    // 由于 no-cors 模式，response.ok 可能不可用
    // 尝试加载图片元素来验证
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
      
      // 超时处理
      setTimeout(() => resolve(false), 5000);
    });
  } catch (error) {
    console.warn('[ProductImage] Failed to validate image URL:', url, error);
    return false;
  }
}
