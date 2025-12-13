/**
 * Design Lab 本地存储工具
 * [2025-12-19 16:30:00] 使用localStorage保存设计草稿，替代后端保存
 */
import type { DesignCanvasSnapshot } from '@/lib/api';

export interface LocalDesignDraft {
  designName: string;
  viewCanvases: {
    front: DesignCanvasSnapshot;
    back: DesignCanvasSnapshot;
    sleeve: DesignCanvasSnapshot;
  };
  currentView: 'front' | 'back' | 'sleeve';
  productInfo: {
    productId: string;
    productName: string;
    variantId: string;
    color: string;
  };
  savedAt: string; // ISO 8601格式时间戳
  version: string; // 版本号，用于后续兼容
}

const STORAGE_KEY = 'designLab:lastDraft';
const CURRENT_VERSION = '1.0.0'; // [2025-12-19 16:30:00] 当前版本号

/**
 * 保存设计草稿到localStorage
 * [2025-12-19 16:30:00]
 */
export function saveDesignToLocalStorage(
  designName: string,
  viewCanvases: {
    front: DesignCanvasSnapshot;
    back: DesignCanvasSnapshot;
    sleeve: DesignCanvasSnapshot;
  },
  currentView: 'front' | 'back' | 'sleeve',
  productInfo: {
    productId: string;
    productName: string;
    variantId: string;
    color: string;
  }
): { success: boolean; error?: string } {
  try {
    const draft: LocalDesignDraft = {
      designName,
      viewCanvases,
      currentView,
      productInfo,
      savedAt: new Date().toISOString(),
      version: CURRENT_VERSION,
    };

    const serialized = JSON.stringify(draft);
    
    // [2025-12-19 16:30:00] 检查存储空间（localStorage通常限制5-10MB）
    // 如果数据过大，尝试保存并捕获错误
    localStorage.setItem(STORAGE_KEY, serialized);
    
    return { success: true };
  } catch (error: any) {
    console.error('[DesignLab] Failed to save draft to localStorage:', error);
    
    // [2025-12-19 16:30:00] 处理常见错误
    if (error.name === 'QuotaExceededError' || error.code === 22) {
      return { success: false, error: '存储空间不足，无法保存设计' };
    } else if (error.name === 'SecurityError') {
      return { success: false, error: '浏览器安全限制，无法保存设计（请检查隐私模式）' };
    } else {
      return { success: false, error: `保存失败: ${error.message || '未知错误'}` };
    }
  }
}

/**
 * 从localStorage读取设计草稿
 * [2025-12-19 16:30:00]
 */
export function loadDesignFromLocalStorage(): LocalDesignDraft | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const draft: LocalDesignDraft = JSON.parse(stored);
    
    // [2025-12-19 16:30:00] 验证版本兼容性（简单版本检查）
    if (draft.version && draft.version !== CURRENT_VERSION) {
      console.warn(`[DesignLab] Draft version mismatch: ${draft.version} vs ${CURRENT_VERSION}. Attempting to load anyway.`);
    }
    
    // [2025-12-19 16:30:00] 验证必要字段
    if (!draft.designName || !draft.viewCanvases || !draft.currentView || !draft.productInfo) {
      console.error('[DesignLab] Invalid draft data structure');
      return null;
    }
    
    return draft;
  } catch (error) {
    console.error('[DesignLab] Failed to load draft from localStorage:', error);
    return null;
  }
}

/**
 * 清除本地存储的设计草稿
 * [2025-12-19 16:30:00]
 */
export function clearDesignFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('[DesignLab] Failed to clear draft from localStorage:', error);
  }
}
