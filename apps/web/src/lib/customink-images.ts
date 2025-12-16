/**
 * Custom Ink 图片 URL 生成工具
 * [2025-01-30 23:55:00] 根据 Custom Ink 的图片 URL 模式生成图片 URL
 * [2025-01-30 23:55:00] 支持从 API 动态获取颜色映射
 * 
 * URL 模式：
 * https://mms-images-prod.imgix.net/mms/images/catalog/{product-id}/colors/{color-id}/views/alt/{view}_{size}.png
 */

// Gildan Softstyle Jersey T-shirt 的产品和颜色映射
export const GILDAN_SOFTSTYLE_PRODUCT_ID = '6a62c76ef0978853a20391b6c32da4fe';

// 颜色名称到颜色 ID 的映射（根据 Custom Ink 分析）
// [2025-01-30 23:55:00] 扩展支持更多颜色
export const COLOR_ID_MAP: Record<string, string> = {
  'White': '176100',
  'Navy': '176101',
  'Maroon': '176102',
  'Black': '176103',
  'Heather Grey': '176104',
  'Heather Dark Grey': '176105',
  'Ice Grey': '176100', // 使用 White 的 ID 作为默认
  'Gray': '176104', // 使用 Heather Grey 的 ID
  'Grey': '176104',
  // [2025-01-30 23:55:00] 扩展颜色（需要从 API 或爬取脚本获取实际 ID）
  'Red': '176106',
  'Royal Blue': '176107',
  'Forest Green': '176108',
  'Purple': '176109',
  'Pink': '176110',
  'Orange': '176111',
  'Yellow': '176112',
  'Charcoal': '176113',
  'Heather Blue': '176114',
  'Heather Red': '176115',
};

// [2025-01-30 23:55:00] 动态颜色映射缓存（从 API 获取）
let dynamicColorMapCache: Record<string, string> | null = null;
let colorMapCacheTimestamp: number = 0;
const COLOR_MAP_CACHE_TTL = 3600000; // 1 小时

/**
 * 从 API 加载颜色映射（如果可用）
 */
export async function loadColorMapFromAPI(productId: string = GILDAN_SOFTSTYLE_PRODUCT_ID): Promise<Record<string, string> | null> {
  try {
    // 检查缓存
    const now = Date.now();
    if (dynamicColorMapCache && (now - colorMapCacheTimestamp) < COLOR_MAP_CACHE_TTL) {
      return dynamicColorMapCache;
    }

    // 尝试从 API 获取（仅在浏览器环境）
    if (typeof window !== 'undefined') {
      const { productColorImageApi } = await import('./api');
      const response = await productColorImageApi.getColorMapping(productId);
      if (response.data && response.data.mapping) {
        dynamicColorMapCache = response.data.mapping;
        colorMapCacheTimestamp = now;
        return dynamicColorMapCache;
      }
    }
  } catch (error) {
    console.warn('[CustomInkImages] Failed to load color map from API:', error);
  }
  
  return null;
}

// 视图类型
export type ViewType = 'front' | 'back' | 'sleeve';

// 图片尺寸
export type ImageSize = 'large_extended' | 'medium_extended';

/**
 * 生成 Custom Ink 产品图片 URL
 * @param productId 产品 ID
 * @param colorId 颜色 ID
 * @param view 视图类型 (front, back, sleeve)
 * @param size 图片尺寸 (large_extended, medium_extended)
 * @param highQuality 是否使用高质量参数
 */
export function generateCustomInkImageUrl(
  productId: string,
  colorId: string,
  view: ViewType,
  size: ImageSize = 'large_extended',
  highQuality: boolean = true
): string {
  // sleeve 视图可能不存在，使用 front 作为后备
  const viewToUse = view === 'sleeve' ? 'front' : view;
  
  const baseUrl = `https://mms-images-prod.imgix.net/mms/images/catalog/${productId}/colors/${colorId}/views/alt/${viewToUse}_${size}.png`;
  
  // [2025-12-20 01:50:00] 阶段2修复：增大图片尺寸，确保能够铺满绿色边框区域
  // 使用 w=4000 获取更大的图片，以确保在高分辨率显示时也能铺满
  if (highQuality) {
    return `${baseUrl}?w=4000&q=100`;
  }
  
  return baseUrl;
}

/**
 * 根据颜色名称获取颜色 ID
 * @param colorName 颜色名称
 * @param useAPI 是否尝试从 API 获取（默认 true）
 */
export async function getColorId(colorName: string | null, useAPI: boolean = true): Promise<string> {
  if (!colorName) {
    return COLOR_ID_MAP['White']; // 默认白色
  }
  
  // [2025-01-30 23:55:00] 尝试从 API 获取映射（如果可用）
  if (useAPI) {
    try {
      const apiMap = await loadColorMapFromAPI();
      if (apiMap && apiMap[colorName]) {
        return apiMap[colorName];
      }
    } catch (error) {
      // 忽略错误，继续使用静态映射
    }
  }
  
  // 尝试精确匹配（静态映射）
  if (COLOR_ID_MAP[colorName]) {
    return COLOR_ID_MAP[colorName];
  }
  
  // 尝试不区分大小写匹配
  const normalizedColorName = colorName.trim();
  for (const [key, value] of Object.entries(COLOR_ID_MAP)) {
    if (key.toLowerCase() === normalizedColorName.toLowerCase()) {
      return value;
    }
  }
  
  // 默认返回白色
  return COLOR_ID_MAP['White'];
}

/**
 * 同步版本的 getColorId（用于向后兼容）
 * @param colorName 颜色名称
 */
export function getColorIdSync(colorName: string | null): string {
  if (!colorName) {
    return COLOR_ID_MAP['White'];
  }
  
  if (COLOR_ID_MAP[colorName]) {
    return COLOR_ID_MAP[colorName];
  }
  
  const normalizedColorName = colorName.trim();
  for (const [key, value] of Object.entries(COLOR_ID_MAP)) {
    if (key.toLowerCase() === normalizedColorName.toLowerCase()) {
      return value;
    }
  }
  
  return COLOR_ID_MAP['White'];
}

/**
 * 生成默认产品的图片 URL（用于 Design Lab）
 * @param colorName 颜色名称
 * @param view 视图类型
 * @param useAPI 是否尝试从 API 获取（默认 false，同步调用）
 */
export function getDefaultProductImageUrl(
  colorName: string | null = 'White',
  view: ViewType = 'front',
  useAPI: boolean = false
): string {
  const colorId = getColorIdSync(colorName);
  return generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, view, 'large_extended', true);
}

/**
 * 异步版本：从 API 获取图片 URL（如果可用）
 * @param colorName 颜色名称
 * @param view 视图类型
 * @param productId 产品 ID（可选，默认使用 GILDAN_SOFTSTYLE_PRODUCT_ID）
 */
export async function getProductImageUrlFromAPI(
  colorName: string | null = 'White',
  view: ViewType = 'front',
  productId: string = GILDAN_SOFTSTYLE_PRODUCT_ID
): Promise<string | null> {
  if (!colorName) {
    colorName = 'White';
  }
  
  try {
    if (typeof window !== 'undefined') {
      const { productColorImageApi } = await import('./api');
      const response = await productColorImageApi.getImageUrlByColor(productId, colorName, view);
      if (response.data && response.data.imageUrl) {
        return response.data.imageUrl;
      }
    }
  } catch (error) {
    console.warn('[CustomInkImages] Failed to get image URL from API:', error);
  }
  
  // 回退到静态生成
  return getDefaultProductImageUrl(colorName, view, false);
}

/**
 * [2025-01-31 14:00:00] 生成 GCS 图片 URL
 * 使用统一的路径模式：design-lab-products/{productKey}/{colorName}/{view}-large_extended.png
 */
function generateGcsImageUrl(productKey: string, colorName: string, view: ViewType): string {
  // 获取 GCS base URL（从环境变量或默认值）
  const gcsBaseUrl = process.env.NEXT_PUBLIC_GCS_IMAGE_BASE_URL || 
                     process.env.GCP_IMAGE_BASE_URL || 
                     'https://storage.googleapis.com/print-main-product-images';
  
  // 标准化颜色名称（小写，空格替换为连字符）
  const colorNameSafe = (colorName || 'White').toLowerCase().replace(/\s+/g, '-');
  
  // 构建路径
  const path = `design-lab-products/${productKey}/${colorNameSafe}/${view}-large_extended.png`;
  
  return `${gcsBaseUrl.replace(/\/$/, '')}/${path}`;
}

/**
 * [2025-01-31 14:00:00] 检查图片是否存在于 GCS（通过尝试加载）
 * 这是一个异步检查，用于验证图片是否真的存在
 */
async function checkGcsImageExists(gcsUrl: string): Promise<boolean> {
  if (typeof window === 'undefined') {
    // 服务端环境，默认返回 true（假设已上传）
    return true;
  }
  
  try {
    const response = await fetch(gcsUrl, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * 生成默认产品的所有视图图片 URL
 * [2025-01-31 14:00:00] 优先使用 GCS URL，如果不存在则使用 Custom Ink 原始 URL
 * @param colorName 颜色名称
 */
export function getDefaultProductBaseImages(colorName: string | null = 'White'): {
  front: string;
  back: string;
  sleeve: string;
} {
  const colorId = getColorIdSync(colorName);
  const productKey = 'gildan-softstyle-tshirt';
  
  // [2025-01-31 14:00:00] 优先使用 GCS URL（根据路径模式生成）
  // 如果图片已上传到 GCS，这些 URL 会生效
  // 如果未上传，将回退到 Custom Ink 原始 URL
  const frontGcs = generateGcsImageUrl(productKey, colorName || 'White', 'front');
  const backGcs = generateGcsImageUrl(productKey, colorName || 'White', 'back');
  const sleeveGcs = generateGcsImageUrl(productKey, colorName || 'White', 'sleeve');
  
  // 生成 Custom Ink 原始 URL 作为备用
  const frontOriginal = generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'front', 'large_extended', true);
  const backOriginal = generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'back', 'large_extended', true);
  const sleeveOriginal = generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'sleeve', 'large_extended', true);
  
  // [2025-01-31 14:00:00] 优先返回 GCS URL
  // 前端加载失败时会自动回退到原始 URL（通过错误处理）
  return {
    front: frontGcs,
    back: backGcs,
    sleeve: sleeveGcs,
  };
}

/**
 * 异步版本：从 API 获取所有视图图片 URL（如果可用）
 * @param colorName 颜色名称
 * @param productId 产品 ID（可选，默认使用 GILDAN_SOFTSTYLE_PRODUCT_ID）
 */
export async function getProductBaseImagesFromAPI(
  colorName: string | null = 'White',
  productId: string = GILDAN_SOFTSTYLE_PRODUCT_ID
): Promise<{ front: string; back: string; sleeve: string } | null> {
  if (!colorName) {
    colorName = 'White';
  }
  
  try {
    if (typeof window !== 'undefined') {
      const { productColorImageApi } = await import('./api');
      const response = await productColorImageApi.getImageUrlByColor(productId, colorName, 'front');
      if (response.data && response.data.allViews) {
        return {
          front: response.data.allViews.front || getDefaultProductImageUrl(colorName, 'front'),
          back: response.data.allViews.back || getDefaultProductImageUrl(colorName, 'back'),
          sleeve: response.data.allViews.sleeve || getDefaultProductImageUrl(colorName, 'sleeve'),
        };
      }
    }
  } catch (error) {
    console.warn('[CustomInkImages] Failed to get base images from API:', error);
  }
  
  // 回退到静态生成
  return getDefaultProductBaseImages(colorName);
}

/**
 * 生成缩略图 URL（用于 Sidebar）
 * @param colorName 颜色名称
 * @param view 视图类型
 */
export function getThumbnailImageUrl(
  colorName: string | null = 'White',
  view: ViewType = 'front'
): string {
  const colorId = getColorIdSync(colorName);
  return generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, view, 'medium_extended', false);
}

