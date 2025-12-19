/**
 * useDesign Hook - 设计管理 Hook
 * [2025-12-18 21:20:48] 管理设计保存、更新、分享等功能
 */
import { useState, useCallback } from 'react';
import * as fabric from 'fabric';
import {
  createDesign,
  updateDesign,
  getDesign,
  shareDesign,
  type DesignDraft,
  type CreateDesignPayload,
  type UpdateDesignPayload,
} from '../../api/design';
import { canvasToSnapshot } from './utils/canvasSerializer';

interface UseDesignOptions {
  canvas: fabric.Canvas | null;
  canvasWidth?: number;
  canvasHeight?: number;
  productVariantId?: string;
  initialDesignId?: string | null;
  initialDesignName?: string;
}

interface UseDesignReturn {
  designId: string | null;
  designName: string;
  setDesignId: (id: string | null) => void;
  setDesignName: (name: string) => void;
  saveDesign: (canvasOverride?: fabric.Canvas | null) => Promise<string | null>;
  updateDesignData: () => Promise<void>;
  loadDesign: (id: string) => Promise<DesignDraft | null>;
  shareDesignLink: () => Promise<string | null>;
  isSaving: boolean;
  error: Error | null;
}

export function useDesign({
  canvas,
  canvasWidth = 4000,
  canvasHeight = 4800,
  productVariantId,
  initialDesignId,
  initialDesignName = 'Untitled Design',
}: UseDesignOptions): UseDesignReturn {
  const [designId, setDesignId] = useState<string | null>(initialDesignId || null);
  const [designName, setDesignName] = useState<string>(initialDesignName);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  /**
   * 保存设计（创建新设计或更新现有设计）
   * @param canvasOverride 可选的 canvas 覆盖（用于处理 canvas 可能为 null 的情况）
   */
  const saveDesign = useCallback(async (canvasOverride?: fabric.Canvas | null): Promise<string | null> => {
    const targetCanvas = canvasOverride || canvas;
    if (!targetCanvas) {
      setError(new Error('Canvas is not initialized'));
      return null;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 序列化画布数据
      const snapshot = canvasToSnapshot(targetCanvas, canvasWidth, canvasHeight);

      let savedDesignId = designId;

      if (!savedDesignId) {
        // 创建新设计
        const payload: CreateDesignPayload = {
          name: designName,
          canvas: snapshot,
          productVariantId: productVariantId as string,
        };

        const newDesign = await createDesign(payload);
        savedDesignId = newDesign.id;
        setDesignId(savedDesignId);
      } else {
        // 更新现有设计
        const payload: UpdateDesignPayload = {
          name: designName,
          canvas: snapshot,
        };

        await updateDesign(savedDesignId, payload);
      }

      return savedDesignId;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to save design');
      setError(error);
      console.error('[useDesign] Failed to save design:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [canvas, canvasWidth, canvasHeight, designId, designName, productVariantId]);

  // [2025-12-18 21:20:48] 更新设计名称的辅助函数
  const updateDesignName = useCallback((name: string) => {
    setDesignName(name);
  }, []);

  /**
   * 更新设计数据（不改变设计ID）
   */
  const updateDesignData = useCallback(async (): Promise<void> => {
    if (!canvas || !designId) {
      setError(new Error('Canvas or design ID is not available'));
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const snapshot = canvasToSnapshot(canvas, canvasWidth, canvasHeight);
      const payload: UpdateDesignPayload = {
        name: designName,
        canvas: snapshot,
      };

      await updateDesign(designId, payload);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update design');
      setError(error);
      console.error('[useDesign] Failed to update design:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [canvas, canvasWidth, canvasHeight, designId, designName]);

  /**
   * 加载设计
   */
  const loadDesign = useCallback(async (id: string): Promise<DesignDraft | null> => {
    try {
      const design = await getDesign(id);
      setDesignId(design.id);
      setDesignName(design.name);
      return design;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load design');
      setError(error);
      console.error('[useDesign] Failed to load design:', error);
      return null;
    }
  }, []);

  /**
   * 分享设计（生成分享链接）
   */
  const shareDesignLink = useCallback(async (): Promise<string | null> => {
    if (!designId) {
      setError(new Error('Design ID is not available'));
      return null;
    }

    try {
      const response = await shareDesign(designId);
      return response.shareUrl;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to share design');
      setError(error);
      console.error('[useDesign] Failed to share design:', error);
      return null;
    }
  }, [designId]);

  return {
    designId,
    designName,
    setDesignId,
    setDesignName: updateDesignName,
    saveDesign,
    updateDesignData,
    loadDesign,
    shareDesignLink,
    isSaving,
    error,
  };
}

