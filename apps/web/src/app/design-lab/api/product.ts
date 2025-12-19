/**
 * Product API - 产品相关 API 封装
 * [2025-12-18 21:18:56] 创建产品模块 API 封装
 */
import { productsApi } from '@/lib/api';

export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  coverImageUrl: string | null;
  category?: string;
}

export interface ProductColor {
  name: string;
  hex: string;
  availableSizes: string[];
  isAvailable: boolean;
}

export interface ProductDetail {
  productId: string;
  productName: string;
  variantId?: string;
  color: string | null;
  colors: string[];
  colorDetails?: ProductColor[];
  variants?: Array<{
    id: string;
    color: string | null;
    colorHex: string | null;
    size: string | null;
    stockQuantity: number;
  }>;
  baseImages: {
    front: string;
    back: string;
    sleeve: string;
  };
  gallery: string[];
}

/**
 * 获取产品列表
 */
export async function getProducts(params?: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
}): Promise<{ data: Product[]; pagination?: any }> {
  try {
    const response = await productsApi.list(params);
    return response;
  } catch (error) {
    console.error('[Product API] Failed to get products:', error);
    throw error;
  }
}

/**
 * 根据 variantId 获取产品详情（用于 Design Lab）
 */
export async function getProductByVariant(variantId: string): Promise<ProductDetail> {
  try {
    const response = await productsApi.getByVariant(variantId);
    return response;
  } catch (error) {
    console.error('[Product API] Failed to get product by variant:', error);
    throw error;
  }
}

/**
 * 根据 productId 获取产品详情
 */
export async function getProduct(productId: string): Promise<ProductDetail> {
  try {
    // 如果 productId 是 variantId 格式，使用 getByVariant
    // 否则需要调用其他 API（需要后端支持）
    const response = await productsApi.getByVariant(productId);
    return response;
  } catch (error) {
    console.error('[Product API] Failed to get product:', error);
    throw error;
  }
}

/**
 * 获取产品颜色列表
 */
export async function getProductColors(productId: string): Promise<ProductColor[]> {
  try {
    // 先获取产品详情，从中提取颜色信息
    const productDetail = await getProduct(productId);
    return productDetail.colorDetails || [];
  } catch (error) {
    console.error('[Product API] Failed to get product colors:', error);
    throw error;
  }
}

