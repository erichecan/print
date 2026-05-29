/**
 * TAG_TAXONOMY — 前端商品 tag 分类体系
 *
 * 每个维度独立，产品可同时属于多个维度。
 * 修改此文件即可更新分类树，无需数据库迁移。
 *
 * 维度说明：
 * - garmentType: 服装类型（一级导航）
 * - audience:    适用人群
 * - neckline:    领型/款式
 * - material:    材质
 * - fit:         版型
 */

export interface TagDimension {
  label: string;
  tags: readonly string[];
}

export const TAG_TAXONOMY = {
  garmentType: {
    label: '服装类型',
    tags: [
      'T-Shirt',
      'Hoodie',
      'Crewneck Sweatshirt',
      'Long-Sleeve T-Shirt',
      'Polo Shirt',
      'V-Neck T-Shirt',
      'Cap',
      'Mug',
    ],
  },
  audience: {
    label: '适用人群',
    tags: ['Adult', "Women's", 'Youth', 'Unisex'],
  },
  neckline: {
    label: 'Neckline',
    tags: ['Crew Neck', 'V-Neck', 'Hooded', 'Polo'],
  },
  material: {
    label: 'Material',
    tags: ['Cotton', 'Poly-Cotton'],
  },
  fit: {
    label: 'Fit',
    tags: ['Classic Fit', 'Fitted'],
  },
  artTheme: {
    label: 'Art Theme',
    tags: [
      'Floral & Botanical',
      'Nature & Landscape',
      'Animals & Wildlife',
      'Cute & Kawaii',
      'Portraits & Figures',
      'Religious & Spiritual',
      'City & Life',
      'Art & Abstract',
    ],
  },
} as const satisfies Record<string, TagDimension>;

export type DimensionKey = keyof typeof TAG_TAXONOMY;

/** Slug ↔ 服装类型标签 双向映射（用于 /catalog/[group] 路由） */
export const GARMENT_SLUG_TO_TAG: Record<string, string> = {
  't-shirts': 'T-Shirt',
  'hoodies': 'Hoodie',
  'sweatshirts': 'Crewneck Sweatshirt',
  'long-sleeve': 'Long-Sleeve T-Shirt',
  'polo-shirts': 'Polo Shirt',
  'v-neck-shirts': 'V-Neck T-Shirt',
  'caps': 'Cap',
  'mugs': 'Mug',
};

/** 不显示 Audience/Neckline 子筛选的品类（非服装，无领型/适用人群概念） */
export const NON_APPAREL_GARMENT_TAGS = new Set(['Mug']);

/** 每种服装类型对应的合理领型（仅显示有意义的子选项） */
export const GARMENT_NECKLINES: Record<string, string[]> = {
  'T-Shirt': ['Crew Neck', 'V-Neck'],
  'Hoodie': ['Hooded'],
  'Crewneck Sweatshirt': ['Crew Neck'],
  'Long-Sleeve T-Shirt': ['Crew Neck', 'V-Neck'],
  'Polo Shirt': ['Polo'],
  'V-Neck T-Shirt': ['V-Neck'],
  'Cap': [],
};

export const GARMENT_TAG_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(GARMENT_SLUG_TO_TAG).map(([slug, tag]) => [tag, slug])
);

/** 将逗号分隔的 tags 字符串解析为数组（URL query 格式） */
export function parseTagsParam(tagsParam: string | null): string[] {
  if (!tagsParam) return [];
  return tagsParam
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

/** 将 tags 数组序列化为 URL query 字符串 */
export function serializeTagsParam(tags: string[]): string {
  return tags.join(',');
}

/** 切换单个 tag（已选则移除，未选则添加） */
export function toggleTag(activeTags: string[], tag: string): string[] {
  return activeTags.includes(tag)
    ? activeTags.filter((t) => t !== tag)
    : [...activeTags, tag];
}
