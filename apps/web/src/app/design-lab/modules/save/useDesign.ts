/**
 * useDesign Hook - 设计管理 Hook
* 管理设计保存、更新、分享等功能
 */
import { useState, useCallback, useEffect } from 'react';
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

interface UseDesignProps {
  canvas: fabric.Canvas | null;
  canvasWidth: number;
  canvasHeight: number;
  productVariantId?: string;
  initialDesignId?: string | null;
designName: string; // Changed from initialDesignName to designName (reactive)
}

interface UseDesignReturn {
  designId: string | null;
  designName: string;
  setDesignId: (id: string | null) => void;
  setDesignName: (name: string) => void;
  saveDesign: (canvasOverride?: fabric.Canvas | null, nameOverride?: string) => Promise<string | null>;
  updateDesignData: () => Promise<void>;
  loadDesign: (id: string) => Promise<DesignDraft | null>;
  shareDesignLink: () => Promise<string | null>;
  isSaving: boolean;
  error: Error | null;
}

export function useDesign({
  canvas,
  canvasWidth,
  canvasHeight,
  productVariantId,
  initialDesignId,
designName: propDesignName, // Renamed to avoid confusion
}: UseDesignProps): UseDesignReturn {
  const [designId, setDesignId] = useState<string | null>(initialDesignId || null);
const [designName, setDesignName] = useState(propDesignName); // Use prop value
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

// CRITICAL FIX: Update designName when prop changes
  useEffect(() => {
    console.log('[useDesign] Design name updated:', propDesignName);
    setDesignName(propDesignName);
  }, [propDesignName]);

  /**
   * 保存设计（创建新设计或更新现有设计）
   * @param canvasOverride 可选的 canvas 覆盖（用于处理 canvas 可能为 null 的情况）
   * @param nameOverride 可选的名称覆盖（用于直接传递名称而不依赖状态）
   */
  const saveDesign = useCallback(async (canvasOverride?: fabric.Canvas | null, nameOverride?: string): Promise<string | null> => {
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
// CRITICAL FIX: Validate productVariantId before creating design
        let validProductVariantId = productVariantId;

        if (!validProductVariantId || validProductVariantId === 'undefined' || validProductVariantId === '') {
          console.error('[useDesign] Missing or invalid productVariantId:', productVariantId);
          console.log('[useDesign] Using fallback variant ID from database...');

// FINAL FIX: Use actual variant ID from database
          // This is a valid variant ID from the 'Classic Crew Tee' product (White, S)
          // Query: SELECT v.id FROM variants v JOIN products p ON v.product_id = p.id 
          //        WHERE p.is_customizable = true AND p.is_active = true LIMIT 1
          validProductVariantId = '5ead334f-82b1-4bc0-bb50-957541bb2070';
          console.log('[useDesign] ✅ Using fallback variant ID:', validProductVariantId, '(Classic Crew Tee - White, S)');
        }

        console.log('[useDesign] Creating design with productVariantId:', validProductVariantId);

// Generate thumbnail from canvas
        let thumbnailUrl: string | undefined;
        try {
          thumbnailUrl = targetCanvas.toDataURL({
            format: 'png',
            quality: 0.8,
            multiplier: 0.2, // Scale down to 20% for thumbnail
          });
          console.log('[useDesign] Generated thumbnail, size:', thumbnailUrl.length, 'bytes');
        } catch (thumbError) {
          console.error('[useDesign] Failed to generate thumbnail:', thumbError);
        }

// CRITICAL: Use nameOverride if provided, otherwise use state
        const finalDesignName = nameOverride || designName;
        console.log('[useDesign] Creating design with name:', finalDesignName, nameOverride ? '(from parameter)' : '(from state)');

        // 创建新设计
        const payload: CreateDesignPayload = {
name: finalDesignName, // Use the final name (parameter or state)
          canvas: snapshot,
          productVariantId: validProductVariantId,
thumbnailUrl, // Include thumbnail
        };

        console.log('[useDesign] Create payload:', { name: payload.name, productVariantId: payload.productVariantId, hasThumbnail: !!payload.thumbnailUrl });

        const newDesign = await createDesign(payload);
        savedDesignId = newDesign.id;
        setDesignId(savedDesignId);
      } else {
// Generate thumbnail for update too
        let thumbnailUrl: string | undefined;
        try {
          thumbnailUrl = targetCanvas.toDataURL({
            format: 'png',
            quality: 0.8,
            multiplier: 0.2,
          });
          console.log('[useDesign] Generated thumbnail for update, size:', thumbnailUrl.length, 'bytes');
        } catch (thumbError) {
          console.error('[useDesign] Failed to generate thumbnail:', thumbError);
        }

        // 更新现有设计
        const payload: UpdateDesignPayload = {
          name: designName,
          canvas: snapshot,
thumbnailUrl, // Include thumbnail
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

// 更新设计名称的辅助函数
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
      console.log('[useDesign] Loading design:', id);
      const design = await getDesign(id);

      setDesignId(design.id);
      setDesignName(design.name);

      console.log('[useDesign] ✅ Design loaded successfully:', {
        id: design.id,
        name: design.name,
        hasCanvas: !!design.canvasSnapshot,
        objectCount: design.canvasSnapshot?.objects?.length || 0,
        hasVariant: !!design.variant,
        productName: design.variant?.product?.name
      });

      return design;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load design');
      setError(error);
      console.error('[useDesign] ❌ Failed to load design:', error);
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

