/**
 * Pricing API - 报价相关 API 封装
* 创建报价模块 API 封装
 */
import { designLabApi } from '@/lib/api';

export interface QuoteRequest {
  quantity?: number;
  sidesUsed?: string[];
  layerCount?: number;
  sizeQuantities?: Array<{ size: string; quantity: number }>;
  estimatedQuantity?: number;
  orderingOptions?: {
    orderType?: 'buy-ship' | 'fundraiser';
    shipping?: 'single-address' | 'multiple-addresses';
    sizesQuantities?: 'i-know-sizes' | 'invite-group';
    payment?: 'i-pay' | 'group-pays';
  };
}

export interface QuoteResponse {
  unitPrice?: number;
  discountedUnitPrice?: number;
  quantity?: number;
  subtotal: number;
  discount?: number;
  total: number;
  currency?: string;
  breakdown?: any;
}

export interface AddToCartRequest {
  designId: string;
  productId?: string;
  variantId?: string;
  quantity: number;
  sizeQuantities?: Array<{ size: string; quantity: number }>;
  orderingOptions?: any;
  quoteData?: QuoteResponse;
}

/**
 * 请求报价
 */
export async function requestQuote(
  designId: string,
  payload: QuoteRequest
): Promise<QuoteResponse> {
  try {
    const response = await designLabApi.requestQuote(designId, payload) as any;
    if (response.data) {
      return response.data;
    }
    throw new Error('Failed to get quote');
  } catch (error) {
    console.error('[Pricing API] Failed to request quote:', error);
    throw error;
  }
}

/**
 * 提交订单
 */
export async function submitOrder(
  designId: string,
  payload: any
): Promise<any> {
  try {
    const response = await designLabApi.submitOrder(designId, payload);
    return response;
  } catch (error) {
    console.error('[Pricing API] Failed to submit order:', error);
    throw error;
  }
}
