/**
 * 设计加载工具
* 从云端或本地加载设计到 Design Lab
 */
'use client';

import { designLabApi } from '@/lib/api';
import type { DesignDraft, DesignCanvasSnapshot } from '@/lib/api';
import { getLocalDesignById, type LocalDesignDraft } from './localStorage';

/**
 * 设计加载结果
 */
export interface DesignLoadResult {
  success: boolean;
  design?: {
    id: string;
    name: string;
canvasData: DesignCanvasSnapshot; // 使用正确的类型
    productInfo: {
      productId: string;
      productName: string;
      variantId: string;
      color: string;
    };
    currentView: 'front' | 'back' | 'sleeve';
    viewCanvases: {
      front: DesignCanvasSnapshot;
      back: DesignCanvasSnapshot;
      sleeve: DesignCanvasSnapshot;
    };
  };
  error?: string;
  source?: 'cloud' | 'local';
}

/**
 * 从云端加载设计
 */
async function loadDesignFromCloud(designId: string): Promise<DesignLoadResult> {
  try {
    const response = await designLabApi.getDraft(designId);

    if (!response.data) {
      return { success: false, error: '设计数据为空' };
    }

    const design = response.data;

// 转换云端设计格式为 Design Lab 需要的格式
    // 云端设计可能只有单面数据（canvasSnapshot），需要转换为三面格式
    const canvasSnapshot: DesignCanvasSnapshot = design.canvasSnapshot || {
      size: { width: 4000, height: 4800 },
      objects: [],
    };

    return {
      success: true,
      design: {
        id: design.id,
        name: design.name || '未命名设计',
        canvasData: canvasSnapshot,
        productInfo: {
          productId: design.variant?.product?.id || '',
          productName: design.variant?.product?.name || '',
          variantId: design.variantId || '',
          color: design.variant?.color || '',
        },
        currentView: 'front', // 默认视图
        viewCanvases: {
          front: canvasSnapshot,
back: { size: canvasSnapshot.size, objects: [] }, // 云端设计可能只有单面数据
          sleeve: { size: canvasSnapshot.size, objects: [] },
        },
      },
      source: 'cloud',
    };
  } catch (error: any) {
    console.error('[DesignLoader] Failed to load design from cloud:', error);
    return {
      success: false,
      error: error.message || '加载云端设计失败',
      source: 'cloud',
    };
  }
}

/**
 * 从本地加载设计
 */
function loadDesignFromLocal(designId: string): DesignLoadResult {
  try {
    const localDesign = getLocalDesignById(designId);

    if (!localDesign) {
      return { success: false, error: '本地设计不存在', source: 'local' };
    }

    // 转换本地设计格式为 Design Lab 需要的格式
    return {
      success: true,
      design: {
        id: localDesign.id,
        name: localDesign.designName,
        canvasData: localDesign.viewCanvases[localDesign.currentView],
        productInfo: localDesign.productInfo,
        currentView: localDesign.currentView,
        viewCanvases: localDesign.viewCanvases,
      },
      source: 'local',
    };
  } catch (error: any) {
    console.error('[DesignLoader] Failed to load design from local:', error);
    return {
      success: false,
      error: error.message || '加载本地设计失败',
      source: 'local',
    };
  }
}

/**
 * 加载设计到 Design Lab
 * @param designId 设计ID
 * @param source 来源：'cloud' 或 'local'
 */
export async function loadDesignToDesignLab(
  designId: string,
  source: 'cloud' | 'local'
): Promise<DesignLoadResult> {
  if (source === 'cloud') {
    return await loadDesignFromCloud(designId);
  } else {
    return loadDesignFromLocal(designId);
  }
}

/**
 * 根据合并设计对象加载设计
 * 优先加载云端版本，如果不存在则加载本地版本
 */
export async function loadMergedDesign(
  mergedDesign: import('@/app/account/utils/designMerger').MergedDesign
): Promise<DesignLoadResult> {
  // 优先加载云端版本
  if (mergedDesign.cloudId) {
    const result = await loadDesignFromCloud(mergedDesign.cloudId);
    if (result.success) {
      return result;
    }
  }

  // 如果云端加载失败或不存在，加载本地版本
  if (mergedDesign.localId) {
    return loadDesignFromLocal(mergedDesign.localId);
  }

  return {
    success: false,
    error: '设计ID不存在',
  };
}

