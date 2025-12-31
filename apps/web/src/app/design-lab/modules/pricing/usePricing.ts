/**
 * usePricing Hook - 报价管理 Hook
* 管理报价请求、加入购物车等功能
 */
import { useState, useCallback } from 'react';
import * as fabric from 'fabric';
import { requestQuote, submitOrder, type QuoteRequest, type QuoteResponse, type AddToCartRequest } from '../../api/pricing';
import { createDesign } from '../../api/design';
import { canvasToSnapshot } from '../save/utils/canvasSerializer';
import { cartApi } from '@/lib/api';

interface UsePricingOptions {
  canvas: fabric.Canvas | null;
  designId: string | null;
  productId?: string;
  variantId?: string;
  canvasWidth?: number;
  canvasHeight?: number;
currentView?: 'front' | 'back' | 'sleeve' | 'left-sleeve' | 'right-sleeve'; // 当前视图
}

interface UsePricingReturn {
  quote: QuoteResponse | null;
  isRequestingQuote: boolean;
  quoteError: Error | null;
  requestQuoteForDesign: (payload: QuoteRequest) => Promise<QuoteResponse | null>;
  addToCart: (orderData: AddToCartRequest) => Promise<void>;
  getQuoteData: () => Promise<{ sidesUsed: string[]; layerCount: number; hasUploadedImages: boolean }>;
}

/**
 * 获取设计使用的面和图层数
 */
function getDesignSidesAndLayers(
  canvas: fabric.Canvas,
  currentView: 'front' | 'back' | 'sleeve' | 'left-sleeve' | 'right-sleeve'
): { sidesUsed: string[]; layerCount: number; hasUploadedImages: boolean } {
  const objects = canvas.getObjects().filter((obj: fabric.Object) => {
    const objName = (obj as any).name;
    return (
      objName &&
      objName !== 'background' &&
      objName !== 'product-image-base' &&
      objName !== 'product-image'
    );
  });

  // 确定使用的面
  const sidesUsed: string[] = [];
  if (currentView === 'front' || objects.some((obj: any) => obj.name?.includes('front'))) {
    sidesUsed.push('front');
  }
  if (currentView === 'back' || objects.some((obj: any) => obj.name?.includes('back'))) {
    sidesUsed.push('back');
  }
  if (currentView === 'sleeve' || objects.some((obj: any) => obj.name?.includes('sleeve'))) {
    sidesUsed.push('sleeve');
  }
  if (currentView === 'left-sleeve' || objects.some((obj: any) => obj.name?.includes('left-sleeve'))) {
    sidesUsed.push('left-sleeve');
  }
  if (currentView === 'right-sleeve' || objects.some((obj: any) => obj.name?.includes('right-sleeve'))) {
    sidesUsed.push('right-sleeve');
  }
  // 如果没有对象，至少包含当前视图
  if (sidesUsed.length === 0 && (currentView as string) !== 'zoom') {
    sidesUsed.push(currentView);
  }

  // 检查是否有上传的图片
  const hasUploadedImages = objects.some((obj: any) => {
    const objName = obj.name || '';
    return objName.includes('upload') || objName.includes('image');
  });

  return {
    sidesUsed,
    layerCount: objects.length,
    hasUploadedImages,
  };
}

export function usePricing({
  canvas,
  designId,
  productId,
  variantId,
  canvasWidth = 4000,
  canvasHeight = 4800,
  currentView = 'front',
}: UsePricingOptions): UsePricingReturn {
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isRequestingQuote, setIsRequestingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState<Error | null>(null);

  /**
   * 获取报价数据（用于 GetPriceFlowModal）
   */
  const getQuoteData = useCallback(async (): Promise<{
    sidesUsed: string[];
    layerCount: number;
    hasUploadedImages: boolean;
  }> => {
    if (!canvas) {
      return {
        sidesUsed: [],
        layerCount: 0,
        hasUploadedImages: false,
      };
    }

    return getDesignSidesAndLayers(canvas, currentView);
  }, [canvas, currentView]);

  /**
   * 请求报价
   */
  const requestQuoteForDesign = useCallback(
    async (payload: QuoteRequest): Promise<QuoteResponse | null> => {
      if (!designId) {
        setQuoteError(new Error('Design ID is required'));
        return null;
      }

      setIsRequestingQuote(true);
      setQuoteError(null);

      try {
        const quoteResponse = await requestQuote(designId, payload);
        setQuote(quoteResponse);
        return quoteResponse;
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Failed to request quote');
        setQuoteError(err);
        console.error('[usePricing] Failed to request quote:', err);
        return null;
      } finally {
        setIsRequestingQuote(false);
      }
    },
    [designId]
  );

  /**
   * 加入购物车
   */
  const addToCart = useCallback(
    async (orderData: AddToCartRequest): Promise<void> => {
      try {
        console.log('[usePricing] Adding to cart:', orderData);

        let finalDesignId = orderData.designId || designId;
        const finalVariantId = orderData.variantId || variantId;

        if (!finalVariantId) {
          throw new Error('Variant ID is required to add to cart');
        }

        // 如果没有设计 ID，先创建一个
        if (!finalDesignId && canvas) {
          console.log('[usePricing] No design ID found, creating temporary design...');
          const snapshot = canvasToSnapshot(canvas, canvasWidth, canvasHeight);
          const newDesign = await createDesign({
            name: 'Custom Design',
            canvas: snapshot,
            productVariantId: finalVariantId,
          });
          finalDesignId = newDesign.id;
        }

        // 整理元数据
        const metadata = {
          orderingOptions: orderData.orderingOptions,
          quoteData: orderData.quoteData,
        };

        // 调用购物车 API
        await cartApi.addItem(
          finalVariantId,
          orderData.quantity,
          finalDesignId || undefined,
          orderData.sizeQuantities,
          metadata
        );

        console.log('[usePricing] Added to cart successfully');
      } catch (error) {
        console.error('[usePricing] Failed to add to cart:', error);
        throw error;
      }
    },
    [canvas, designId, variantId, canvasWidth, canvasHeight]
  );

  return {
    quote,
    isRequestingQuote,
    quoteError,
    requestQuoteForDesign,
    addToCart,
    getQuoteData,
  };
}

