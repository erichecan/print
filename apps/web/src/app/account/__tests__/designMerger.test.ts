/**
 * 设计合并工具测试
 * [2025-01-31 00:25:00]
 */
import { mergeDesigns, filterDesignsByDays } from '../utils/designMerger';
import type { UserDesign } from '@/lib/api';
import type { LocalDesignDraft } from '@/app/design-lab/utils/localStorage';

describe('designMerger', () => {
  const mockCloudDesign: UserDesign = {
    id: 'cloud-1',
    name: 'Cloud Design',
    thumbnailUrl: 'https://example.com/thumb.jpg',
    createdAt: '2025-01-15T10:00:00Z',
    updatedAt: '2025-01-20T10:00:00Z',
    productName: 'T-Shirt',
  };

  const mockLocalDesign: LocalDesignDraft = {
    id: 'local-1',
    designName: 'Local Design',
    viewCanvases: {
      front: { size: { width: 4000, height: 4800 }, objects: [] },
      back: { size: { width: 4000, height: 4800 }, objects: [] },
      sleeve: { size: { width: 4000, height: 4800 }, objects: [] },
    },
    currentView: 'front',
    productInfo: {
      productId: 'prod-1',
      productName: 'Hoodie',
      variantId: 'var-1',
      color: 'Black',
    },
    savedAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-01-25T10:00:00Z',
    version: '1.0.0',
    source: 'local',
  };

  describe('mergeDesigns', () => {
    it('应该合并云端和本地设计', () => {
      const cloudDesigns: UserDesign[] = [mockCloudDesign];
      const localDesigns: LocalDesignDraft[] = [mockLocalDesign];

      const merged = mergeDesigns(cloudDesigns, localDesigns);

      expect(merged).toHaveLength(2);
      expect(merged[0].source).toBe('cloud');
      expect(merged[1].source).toBe('local');
    });

    it('应该识别匹配的设计并标记为 both', () => {
      const cloudDesign: UserDesign = {
        ...mockCloudDesign,
        name: 'Local Design',
        productName: 'Hoodie',
      };
      const localDesign: LocalDesignDraft = {
        ...mockLocalDesign,
        designName: 'Local Design',
        productInfo: {
          ...mockLocalDesign.productInfo,
          productName: 'Hoodie',
        },
      };

      const merged = mergeDesigns([cloudDesign], [localDesign]);

      expect(merged).toHaveLength(1);
      expect(merged[0].source).toBe('both');
      expect(merged[0].cloudId).toBe(cloudDesign.id);
      expect(merged[0].localId).toBe(localDesign.id);
    });

    it('应该按更新时间降序排序', () => {
      const cloudDesign1: UserDesign = {
        ...mockCloudDesign,
        id: 'cloud-1',
        updatedAt: '2025-01-10T10:00:00Z',
      };
      const cloudDesign2: UserDesign = {
        ...mockCloudDesign,
        id: 'cloud-2',
        updatedAt: '2025-01-20T10:00:00Z',
      };

      const merged = mergeDesigns([cloudDesign1, cloudDesign2], []);

      expect(merged[0].id).toBe('cloud-2'); // 更新的在前
      expect(merged[1].id).toBe('cloud-1');
    });
  });

  describe('filterDesignsByDays', () => {
    it('应该筛选指定天数内的设计', () => {
      const now = new Date();
      const designs = [
        {
          id: '1',
          name: 'Recent',
          updatedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10天前
          source: 'cloud' as const,
        },
        {
          id: '2',
          name: 'Old',
          updatedAt: new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000).toISOString(), // 40天前
          source: 'cloud' as const,
        },
      ];

      const filtered = filterDesignsByDays(designs, 30);

      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe('1');
    });

    it('days=0 应该返回全部设计', () => {
      const designs = [
        { id: '1', name: 'Design 1', updatedAt: '2025-01-01T10:00:00Z', source: 'cloud' as const },
        { id: '2', name: 'Design 2', updatedAt: '2025-01-01T10:00:00Z', source: 'cloud' as const },
      ];

      const filtered = filterDesignsByDays(designs, 0);

      expect(filtered).toHaveLength(2);
    });
  });
});

