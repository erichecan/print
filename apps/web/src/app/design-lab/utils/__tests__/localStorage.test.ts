/**
 * localStorage 工具测试
 */
import {
  saveDesignToLocalStorage,
  getAllLocalDesigns,
  getLocalDesignsByDays,
  getLocalDesignById,
  deleteLocalDesign,
  clearAllLocalDesigns,
} from '../localStorage';
import type { DesignCanvasSnapshot } from '@/lib/api';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('localStorage utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const mockCanvasSnapshot: DesignCanvasSnapshot = {
    size: { width: 4000, height: 4800 },
    objects: [],
  };

  const mockProductInfo = {
    productId: 'prod-1',
    productName: 'T-Shirt',
    variantId: 'var-1',
    color: 'White',
  };

  describe('saveDesignToLocalStorage', () => {
    it('应该保存设计到 localStorage', () => {
      const result = saveDesignToLocalStorage(
        'Test Design',
        {
          front: mockCanvasSnapshot,
          back: mockCanvasSnapshot,
          sleeve: mockCanvasSnapshot,
        },
        'front',
        mockProductInfo
      );

      expect(result.success).toBe(true);
      expect(result.designId).toBeDefined();

      const allDesigns = getAllLocalDesigns();
      expect(allDesigns).toHaveLength(1);
      expect(allDesigns[0].designName).toBe('Test Design');
    });

    it('应该更新现有设计', () => {
      const firstResult = saveDesignToLocalStorage(
        'Original Name',
        {
          front: mockCanvasSnapshot,
          back: mockCanvasSnapshot,
          sleeve: mockCanvasSnapshot,
        },
        'front',
        mockProductInfo
      );

      expect(firstResult.success).toBe(true);
      const designId = firstResult.designId!;

      const secondResult = saveDesignToLocalStorage(
        'Updated Name',
        {
          front: mockCanvasSnapshot,
          back: mockCanvasSnapshot,
          sleeve: mockCanvasSnapshot,
        },
        'back',
        mockProductInfo,
        designId
      );

      expect(secondResult.success).toBe(true);

      const allDesigns = getAllLocalDesigns();
      expect(allDesigns).toHaveLength(1);
      expect(allDesigns[0].designName).toBe('Updated Name');
      expect(allDesigns[0].currentView).toBe('back');
    });
  });

  describe('getAllLocalDesigns', () => {
    it('应该返回所有本地设计', () => {
      saveDesignToLocalStorage('Design 1', {
        front: mockCanvasSnapshot,
        back: mockCanvasSnapshot,
        sleeve: mockCanvasSnapshot,
      }, 'front', mockProductInfo);

      saveDesignToLocalStorage('Design 2', {
        front: mockCanvasSnapshot,
        back: mockCanvasSnapshot,
        sleeve: mockCanvasSnapshot,
      }, 'front', mockProductInfo);

      const allDesigns = getAllLocalDesigns();
      expect(allDesigns).toHaveLength(2);
    });

    it('应该返回空数组当没有设计时', () => {
      const allDesigns = getAllLocalDesigns();
      expect(allDesigns).toHaveLength(0);
    });
  });

  describe('getLocalDesignsByDays', () => {
    it('应该筛选指定天数内的设计', () => {
      // 创建不同时间的设计
      const now = new Date();
      const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      // 保存第一个设计（10天前）
      const result1 = saveDesignToLocalStorage(
        'Recent Design',
        {
          front: mockCanvasSnapshot,
          back: mockCanvasSnapshot,
          sleeve: mockCanvasSnapshot,
        },
        'front',
        mockProductInfo
      );
      const design1 = getLocalDesignById(result1.designId!);
      if (design1) {
        design1.updatedAt = tenDaysAgo.toISOString();
        localStorage.setItem('designLab:designs', JSON.stringify([design1]));
      }

      // 保存第二个设计（40天前）
      const result2 = saveDesignToLocalStorage(
        'Old Design',
        {
          front: mockCanvasSnapshot,
          back: mockCanvasSnapshot,
          sleeve: mockCanvasSnapshot,
        },
        'front',
        mockProductInfo
      );
      const design2 = getLocalDesignById(result2.designId!);
      if (design2) {
        design2.updatedAt = fortyDaysAgo.toISOString();
        const allDesigns = getAllLocalDesigns();
        const updatedDesigns = allDesigns.map(d => 
          d.id === design2.id ? design2 : d
        );
        localStorage.setItem('designLab:designs', JSON.stringify(updatedDesigns));
      }

      const filtered = getLocalDesignsByDays(30);
      expect(filtered.length).toBeGreaterThanOrEqual(1);
      expect(filtered.some(d => d.designName === 'Recent Design')).toBe(true);
    });
  });

  describe('getLocalDesignById', () => {
    it('应该根据ID获取设计', () => {
      const result = saveDesignToLocalStorage(
        'Test Design',
        {
          front: mockCanvasSnapshot,
          back: mockCanvasSnapshot,
          sleeve: mockCanvasSnapshot,
        },
        'front',
        mockProductInfo
      );

      const design = getLocalDesignById(result.designId!);
      expect(design).not.toBeNull();
      expect(design?.designName).toBe('Test Design');
    });

    it('应该返回 null 当设计不存在时', () => {
      const design = getLocalDesignById('non-existent-id');
      expect(design).toBeNull();
    });
  });

  describe('deleteLocalDesign', () => {
    it('应该删除指定设计', () => {
      const result = saveDesignToLocalStorage(
        'Test Design',
        {
          front: mockCanvasSnapshot,
          back: mockCanvasSnapshot,
          sleeve: mockCanvasSnapshot,
        },
        'front',
        mockProductInfo
      );

      const deleteResult = deleteLocalDesign(result.designId!);
      expect(deleteResult.success).toBe(true);

      const allDesigns = getAllLocalDesigns();
      expect(allDesigns).toHaveLength(0);
    });

    it('应该返回错误当设计不存在时', () => {
      const deleteResult = deleteLocalDesign('non-existent-id');
      expect(deleteResult.success).toBe(false);
      expect(deleteResult.error).toBeDefined();
    });
  });

  describe('clearAllLocalDesigns', () => {
    it('应该清除所有本地设计', () => {
      saveDesignToLocalStorage('Design 1', {
        front: mockCanvasSnapshot,
        back: mockCanvasSnapshot,
        sleeve: mockCanvasSnapshot,
      }, 'front', mockProductInfo);

      saveDesignToLocalStorage('Design 2', {
        front: mockCanvasSnapshot,
        back: mockCanvasSnapshot,
        sleeve: mockCanvasSnapshot,
      }, 'front', mockProductInfo);

      clearAllLocalDesigns();

      const allDesigns = getAllLocalDesigns();
      expect(allDesigns).toHaveLength(0);
    });
  });
});

