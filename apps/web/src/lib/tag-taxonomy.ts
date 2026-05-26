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
