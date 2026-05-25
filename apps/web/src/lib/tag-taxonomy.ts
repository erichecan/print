export type DimensionKey = 'audience' | 'neckline' | 'material' | 'fit';

export const TAG_TAXONOMY: Record<DimensionKey, { label: string; tags: string[] }> = {
  audience: {
    label: '适用人群',
    tags: ['Men', 'Women', 'Youth', 'Unisex'],
  },
  neckline: {
    label: '领型',
    tags: ['Crew Neck', 'V-Neck', 'Polo', 'Henley'],
  },
  material: {
    label: '材质',
    tags: ['Cotton', 'Polyester', 'Blend', 'Tri-Blend'],
  },
  fit: {
    label: '版型',
    tags: ['Regular', 'Slim', 'Relaxed', 'Oversized'],
  },
};

export const GARMENT_SLUG_TO_TAG: Record<string, string> = {
  't-shirts': 'T-Shirt',
  'long-sleeves': 'Long Sleeve',
  'tank-tops': 'Tank Top',
  hoodies: 'Hoodie',
  sweatshirts: 'Sweatshirt',
};

export function parseTagsParam(param: string | null): string[] {
  if (!param) return [];
  return param
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
}

export function serializeTagsParam(tags: string[]): string {
  return tags.join(',');
}

export function toggleTag(current: string[], tag: string): string[] {
  return current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag];
}
