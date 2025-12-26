/**
 * Design Lab 本地存储工具
 * [2025-12-19 16:30:00] 使用localStorage保存设计草稿，替代后端保存
 * [2025-01-30 23:45:00] 扩展：支持多个设计存储、时间筛选、删除功能
 */
'use client';

import type { DesignCanvasSnapshot } from '@/lib/api';

export interface LocalDesignDraft {
  id: string; // [2025-01-30 23:45:00] 新增：唯一标识符
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
  savedAt: string; // ISO 8601格式时间戳（创建时间）
  updatedAt: string; // [2025-01-30 23:45:00] 新增：最后编辑时间
  version: string; // 版本号，用于后续兼容
  source: 'local'; // [2025-01-30 23:45:00] 新增：标识来源
}

const STORAGE_KEY_LAST_DRAFT = 'designLab:lastDraft'; // 保留：最后一个草稿（向后兼容）
const STORAGE_KEY_DESIGNS = 'designLab:designs'; // [2025-01-30 23:45:00] 新增：所有设计列表
const CURRENT_VERSION = '1.0.0'; // [2025-12-19 16:30:00] 当前版本号

/**
 * 生成唯一ID
 * [2025-01-30 23:45:00]
 */
function generateDesignId(): string {
  return `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 保存设计草稿到localStorage
 * [2025-12-19 16:30:00]
 * [2025-01-30 23:45:00] 更新：支持多个设计存储，自动生成ID
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
  },
  designId?: string // [2025-01-30 23:45:00] 可选：如果提供则更新现有设计
): { success: boolean; error?: string; designId?: string } {
  try {
    const now = new Date().toISOString();
    const id = designId || generateDesignId();

    const draft: LocalDesignDraft = {
      id,
      designName,
      viewCanvases,
      currentView,
      productInfo,
      savedAt: designId ? (getLocalDesignById(id)?.savedAt || now) : now, // 保留原始创建时间
      updatedAt: now, // [2025-01-30 23:45:00] 最后编辑时间
      version: CURRENT_VERSION,
      source: 'local',
    };

    // [2025-01-30 23:45:00] 保存到设计列表
    const allDesigns = getAllLocalDesigns();
    const existingIndex = allDesigns.findIndex(d => d.id === id);

    if (existingIndex >= 0) {
      // 更新现有设计
      allDesigns[existingIndex] = draft;
    } else {
      // 添加新设计
      allDesigns.push(draft);
    }

    localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(allDesigns));

    // [2025-12-19 16:30:00] 同时保存为最后一个草稿（向后兼容）
    localStorage.setItem(STORAGE_KEY_LAST_DRAFT, JSON.stringify(draft));

    return { success: true, designId: id };
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
 * 从localStorage读取设计草稿（最后一个草稿，向后兼容）
 * [2025-12-19 16:30:00]
 */
export function loadDesignFromLocalStorage(): LocalDesignDraft | null {
  try {
    // [2025-01-30 23:45:00] 优先从设计列表获取最新的
    const allDesigns = getAllLocalDesigns();
    if (allDesigns.length > 0) {
      // 返回最近编辑的设计
      const sorted = allDesigns.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      return sorted[0];
    }

    // 向后兼容：从旧存储位置读取
    const stored = localStorage.getItem(STORAGE_KEY_LAST_DRAFT);
    if (!stored) {
      return null;
    }

    const draft: LocalDesignDraft = JSON.parse(stored);

    // [2025-01-30 23:45:00] 迁移旧数据：如果没有ID，生成一个
    if (!draft.id) {
      draft.id = generateDesignId();
      draft.updatedAt = draft.updatedAt || draft.savedAt;
      draft.source = 'local';
    }

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
 * 获取所有本地设计
 * [2025-01-30 23:45:00]
 */
export function getAllLocalDesigns(): LocalDesignDraft[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_DESIGNS);
    if (!stored) {
      return [];
    }

    const designs: LocalDesignDraft[] = JSON.parse(stored);

    // 验证和迁移旧数据
    return designs.map(design => {
      if (!design.id) {
        design.id = generateDesignId();
      }
      if (!design.updatedAt) {
        design.updatedAt = design.savedAt;
      }
      if (!design.source) {
        design.source = 'local';
      }
      return design;
    }).filter(design => {
      // 验证必要字段
      return design.designName && design.viewCanvases && design.currentView && design.productInfo;
    });
  } catch (error) {
    console.error('[DesignLab] Failed to get all local designs:', error);
    return [];
  }
}

/**
 * 根据ID获取本地设计
 * [2025-01-30 23:45:00]
 */
export function getLocalDesignById(id: string): LocalDesignDraft | null {
  const designs = getAllLocalDesigns();
  return designs.find(d => d.id === id) || null;
}

/**
 * 根据时间筛选本地设计
 * [2025-01-30 23:45:00]
 * @param days 天数，0表示全部
 */
export function getLocalDesignsByDays(days: number): LocalDesignDraft[] {
  const allDesigns = getAllLocalDesigns();

  if (days === 0) {
    return allDesigns;
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return allDesigns.filter(design => {
    const updatedAt = new Date(design.updatedAt || design.savedAt);
    return updatedAt >= cutoffDate;
  });
}

/**
 * 删除本地设计
 * [2025-01-30 23:45:00]
 */
export function deleteLocalDesign(id: string): { success: boolean; error?: string } {
  try {
    const allDesigns = getAllLocalDesigns();
    const filtered = allDesigns.filter(d => d.id !== id);

    if (filtered.length === allDesigns.length) {
      return { success: false, error: '设计不存在' };
    }

    localStorage.setItem(STORAGE_KEY_DESIGNS, JSON.stringify(filtered));

    // 如果删除的是最后一个草稿，也清除旧存储
    const lastDraft = loadDesignFromLocalStorage();
    if (lastDraft?.id === id) {
      localStorage.removeItem(STORAGE_KEY_LAST_DRAFT);
    }

    return { success: true };
  } catch (error: any) {
    console.error('[DesignLab] Failed to delete local design:', error);
    return { success: false, error: `删除失败: ${error.message || '未知错误'}` };
  }
}

/**
 * 清除本地存储的设计草稿（最后一个草稿，向后兼容）
 * [2025-12-19 16:30:00]
 */
export function clearDesignFromLocalStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_LAST_DRAFT);
  } catch (error) {
    console.error('[DesignLab] Failed to clear draft from localStorage:', error);
  }
}

/**
 * 清除所有本地设计
 * [2025-01-30 23:45:00]
 */
export function clearAllLocalDesigns(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DESIGNS);
    localStorage.removeItem(STORAGE_KEY_LAST_DRAFT);
  } catch (error) {
    console.error('[DesignLab] Failed to clear all local designs:', error);
  }
}
