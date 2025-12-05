/**
 * Custom Ink 图片 URL 生成工具
 * [2025-01-30 23:55:00] 根据 Custom Ink 的图片 URL 模式生成图片 URL
 * 
 * URL 模式：
 * https://mms-images-prod.imgix.net/mms/images/catalog/{product-id}/colors/{color-id}/views/alt/{view}_{size}.png
 */

// Gildan Softstyle Jersey T-shirt 的产品和颜色映射
export const GILDAN_SOFTSTYLE_PRODUCT_ID = '6a62c76ef0978853a20391b6c32da4fe';

// 颜色名称到颜色 ID 的映射（根据 Custom Ink 分析）
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
};

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
  
  if (highQuality) {
    return `${baseUrl}?w=2000&q=100`;
  }
  
  return baseUrl;
}

/**
 * 根据颜色名称获取颜色 ID
 * @param colorName 颜色名称
 */
export function getColorId(colorName: string | null): string {
  if (!colorName) {
    return COLOR_ID_MAP['White']; // 默认白色
  }
  
  // 尝试精确匹配
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
 * 生成默认产品的图片 URL（用于 Design Lab）
 * @param colorName 颜色名称
 * @param view 视图类型
 */
export function getDefaultProductImageUrl(
  colorName: string | null = 'White',
  view: ViewType = 'front'
): string {
  const colorId = getColorId(colorName);
  return generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, view, 'large_extended', true);
}

/**
 * 生成默认产品的所有视图图片 URL
 * @param colorName 颜色名称
 */
export function getDefaultProductBaseImages(colorName: string | null = 'White'): {
  front: string;
  back: string;
  sleeve: string;
} {
  const colorId = getColorId(colorName);
  
  return {
    front: generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'front', 'large_extended', true),
    back: generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'back', 'large_extended', true),
    sleeve: generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, 'sleeve', 'large_extended', true),
  };
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
  const colorId = getColorId(colorName);
  return generateCustomInkImageUrl(GILDAN_SOFTSTYLE_PRODUCT_ID, colorId, view, 'medium_extended', false);
}

