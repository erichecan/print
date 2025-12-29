/**
 * Design API - 设计相关 API 封装
 * [2025-12-18 21:20:48] 创建设计模块 API 封装
 */
import { designLabApi } from '@/lib/api';

export interface DesignDraft {
  id: string;
  name: string;
  canvas: any;
  productVariantId?: string;
  createdAt?: string;
  updatedAt?: string;
  shareToken?: string;
  shareUrl?: string;
}

export interface CreateDesignPayload {
  name: string;
  canvas: any;
  productVariantId: string;
  thumbnailUrl?: string; // [2025-12-28] Add thumbnail support
}

export interface UpdateDesignPayload {
  name?: string;
  canvas?: any;
  thumbnailUrl?: string; // [2025-12-28] Add thumbnail support
}

export interface ShareDesignResponse {
  shareToken: string;
  shareUrl: string;
}

/**
 * 创建设计草稿
 */
export async function createDesign(payload: CreateDesignPayload): Promise<DesignDraft> {
  try {
    const response = await designLabApi.createDraft(payload as any) as any;
    if (response.data) {
      return response.data;
    }
    throw new Error('Failed to create design');
  } catch (error) {
    console.error('[Design API] Failed to create design:', error);
    throw error;
  }
}

/**
 * 更新设计草稿
 */
export async function updateDesign(
  designId: string,
  payload: UpdateDesignPayload
): Promise<DesignDraft> {
  try {
    const response = await designLabApi.updateDraft(designId, payload) as any;
    if (response.data) {
      return response.data;
    }
    throw new Error('Failed to update design');
  } catch (error) {
    console.error('[Design API] Failed to update design:', error);
    throw error;
  }
}

/**
 * 获取设计详情
 */
export async function getDesign(designId: string): Promise<DesignDraft> {
  try {
    const response = await designLabApi.getDesign(designId) as any;
    if (response.data) {
      return response.data as any;
    }
    throw new Error('Failed to get design');
  } catch (error) {
    console.error('[Design API] Failed to get design:', error);
    throw error;
  }
}

/**
 * 分享设计（生成分享链接）
 */
export async function shareDesign(designId: string): Promise<ShareDesignResponse> {
  try {
    const response = await designLabApi.shareDesign(designId) as any;
    if (response.data) {
      return response.data;
    }
    throw new Error('Failed to share design');
  } catch (error) {
    console.error('[Design API] Failed to share design:', error);
    throw error;
  }
}

/**
 * 删除设计草稿
 */
export async function deleteDesign(designId: string): Promise<void> {
  try {
    await designLabApi.deleteDraft(designId);
  } catch (error) {
    console.error('[Design API] Failed to delete design:', error);
    throw error;
  }
}
