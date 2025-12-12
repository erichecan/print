// [2025-01-31 19:50:00] 印刷位置模板配置

import type { PrintConfig } from '@/types/order';

export function defaultTemplateFor(
  name: 'front_small_chest' | 'back_full' | 'left_sleeve' | 'right_sleeve' | 'inside_tag'
): PrintConfig[] {
  switch (name) {
    case 'front_small_chest':
      return [{ position: 'front', areaSize: { widthCm: 10, heightCm: 10 } }];
    case 'back_full':
      return [{ position: 'back', areaSize: { widthCm: 30, heightCm: 40 } }];
    case 'left_sleeve':
      return [{ position: 'left_sleeve', areaSize: { widthCm: 8, heightCm: 25 } }];
    case 'right_sleeve':
      return [{ position: 'right_sleeve', areaSize: { widthCm: 8, heightCm: 25 } }];
    case 'inside_tag':
      return [{ position: 'tag_inside', areaSize: { widthCm: 6, heightCm: 6 } }];
  }
}
