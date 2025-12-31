/**
 * Fonts Configuration
* 字体配置文件，支持从配置文件或 API 加载字体
 * 字体可以在这里管理，也可以后续迁移到数据库进行后台管理
 */

export type FontCategory = 'latin' | 'chinese' | 'japanese' | 'hindi' | 'arabic' | 'korean' | 'thai';

export interface FontInfo {
  name: string;
  displayName?: string; // 显示名称（可选，如果与 name 不同）
  previewText: string; // 预览文本
  category: FontCategory;
  source: 'system' | 'google' | 'custom'; // 字体来源
  googleFontFamily?: string; // Google Fonts 家族名称（如果 source 是 google）
  weights?: string[]; // 字体粗细（如 ['400', '500', '700']）
  isActive?: boolean; // 是否启用（默认 true）
  sortOrder?: number; // 排序顺序
}

/**
* 字体库配置
 * 可以在这里添加更多免费字体
 * 后续可以迁移到数据库，通过后台管理界面管理
 */
export const FONTS_CONFIG: FontInfo[] = [
  // ========== Latin Fonts ==========
  { name: 'Arial', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 1 },
  { name: 'Helvetica', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 2 },
  { name: 'Times New Roman', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 3 },
  { name: 'Courier New', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 4 },
  { name: 'Georgia', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 5 },
  { name: 'Verdana', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 6 },
  { name: 'Comic Sans MS', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 7 },
  { name: 'Impact', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 8 },
  { name: 'Trebuchet MS', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 9 },
  { name: 'Palatino', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 10 },
  { name: 'Garamond', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 11 },
  { name: 'Bookman', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 12 },
  { name: 'Avant Garde', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 13 },
  { name: 'Arial Black', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 14 },
  { name: 'Tahoma', previewText: 'Aa', category: 'latin', source: 'system', sortOrder: 15 },
  
  // Google Fonts - Latin
  { name: 'Roboto', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Roboto', weights: ['400', '500', '700'], sortOrder: 16 },
  { name: 'Open Sans', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Open Sans', weights: ['400', '600', '700'], sortOrder: 17 },
  { name: 'Lato', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Lato', weights: ['400', '700'], sortOrder: 18 },
  { name: 'Montserrat', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Montserrat', weights: ['400', '600', '700'], sortOrder: 19 },
  { name: 'Oswald', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Oswald', weights: ['400', '600', '700'], sortOrder: 20 },
  { name: 'Poppins', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Poppins', weights: ['400', '600', '700'], sortOrder: 21 },
  { name: 'Raleway', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Raleway', weights: ['400', '600', '700'], sortOrder: 22 },
  { name: 'Playfair Display', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Playfair Display', weights: ['400', '700'], sortOrder: 23 },
  { name: 'Merriweather', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Merriweather', weights: ['400', '700'], sortOrder: 24 },
  { name: 'Source Sans Pro', previewText: 'Aa', category: 'latin', source: 'google', googleFontFamily: 'Source Sans Pro', weights: ['400', '600', '700'], sortOrder: 25 },
  
  // ========== Chinese Fonts (简体) ==========
  { name: 'Noto Sans SC', previewText: '你好', category: 'chinese', source: 'google', googleFontFamily: 'Noto Sans SC', weights: ['400', '500', '600', '700'], sortOrder: 1 },
  { name: 'SimHei', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 2 },
  { name: 'SimSun', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 3 },
  { name: 'Microsoft YaHei', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 4 },
  { name: 'KaiTi', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 5 },
  { name: 'FangSong', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 6 },
  
  // ========== Chinese Fonts (繁体) ==========
  { name: 'Noto Sans TC', previewText: '你好', category: 'chinese', source: 'google', googleFontFamily: 'Noto Sans TC', weights: ['400', '500', '600', '700'], sortOrder: 7 },
  { name: 'Microsoft JhengHei', previewText: '你好', category: 'chinese', source: 'system', sortOrder: 8 },
  
  // ========== Japanese Fonts ==========
  { name: 'Noto Sans JP', previewText: 'こんにちは', category: 'japanese', source: 'google', googleFontFamily: 'Noto Sans JP', weights: ['400', '500', '600', '700'], sortOrder: 1 },
  { name: 'MS Gothic', previewText: 'こんにちは', category: 'japanese', source: 'system', sortOrder: 2 },
  { name: 'MS Mincho', previewText: 'こんにちは', category: 'japanese', source: 'system', sortOrder: 3 },
  { name: 'Yu Gothic', previewText: 'こんにちは', category: 'japanese', source: 'system', sortOrder: 4 },
  { name: 'Meiryo', previewText: 'こんにちは', category: 'japanese', source: 'system', sortOrder: 5 },
  
  // ========== Hindi Fonts (Devanagari) ==========
  { name: 'Noto Sans Devanagari', previewText: 'नमस्ते', category: 'hindi', source: 'google', googleFontFamily: 'Noto Sans Devanagari', weights: ['400', '500', '600', '700'], sortOrder: 1 },
  { name: 'Mangal', previewText: 'नमस्ते', category: 'hindi', source: 'system', sortOrder: 2 },
  { name: 'Arial Unicode MS', previewText: 'नमस्ते', category: 'hindi', source: 'system', sortOrder: 3 },
];

/**
* 获取所有启用的字体
 */
export function getActiveFonts(): FontInfo[] {
  return FONTS_CONFIG.filter(font => font.isActive !== false).sort((a, b) => {
    // 先按分类排序
    const categoryOrder: Record<FontCategory, number> = {
      latin: 1,
      chinese: 2,
      japanese: 3,
      hindi: 4,
      arabic: 5,
      korean: 6,
      thai: 7,
    };
    const categoryDiff = categoryOrder[a.category] - categoryOrder[b.category];
    if (categoryDiff !== 0) return categoryDiff;
    
    // 同分类内按 sortOrder 排序
    return (a.sortOrder || 999) - (b.sortOrder || 999);
  });
}

/**
* 按分类获取字体
 */
export function getFontsByCategory(category: FontCategory): FontInfo[] {
  return getActiveFonts().filter(font => font.category === category);
}

/**
* 获取所有分类
 */
export function getFontCategories(): FontCategory[] {
  const categories = new Set<FontCategory>();
  getActiveFonts().forEach(font => categories.add(font.category));
  return Array.from(categories);
}

/**
* 分类标签映射
 */
export const FONT_CATEGORY_LABELS: Record<FontCategory, string> = {
  latin: 'Latin Fonts',
  chinese: 'Chinese Fonts (中文)',
  japanese: 'Japanese Fonts (日本語)',
  hindi: 'Hindi Fonts (हिंदी)',
  arabic: 'Arabic Fonts (العربية)',
  korean: 'Korean Fonts (한국어)',
  thai: 'Thai Fonts (ไทย)',
};

