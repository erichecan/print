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
    imageUrl?: string;
    size: string | null;
    stockQuantity: number;
  }>;
  baseImages: {
    front: string;
    back: string;
    sleeve: string;
    'left-sleeve'?: string;
    'right-sleeve'?: string;
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
    const response: any = await productsApi.list(params);

    // [2025-12-31] Map backend response to Design Lab Product interface
    if (response && response.data) {
      const mappedData = response.data.map((item: any) => ({
        id: item.id,
        title: item.name || item.title || 'Untitled',
        slug: item.slug,
        // Backend returns price object { base, sale, currency }, frontend expects number
        // ProductCatalogModal handles object check, but let's normalize if possible.
        // Actually, let's keep the object if the UI expects it, but the interface says number.
        // Let's pass the sale price (actual price) as the number to satisfy the interface.
        price: typeof item.price === 'object' ? (item.price.sale || item.price.base) : item.price,
        // Map primaryImage.url or first image to coverImageUrl
        coverImageUrl: item.primaryImage?.url || item.images?.[0]?.url || item.coverImageUrl || null,
        // Map category object to name
        category: typeof item.category === 'object' ? item.category.name : item.category
      }));

      return {
        ...response,
        data: mappedData
      };
    }

    return { data: [], pagination: response?.pagination };
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
    // [2025-12-31] First try slug lookup (standard for Design Lab default)
    const response: any = await productsApi.getBySlug(productId);

    // The slug API returns { id, name, ... } but we need { productId, productName, ... }
    if (response && response.id) {
      return {
        ...response,
        productId: response.id,
        productName: response.name,
        // Ensure other fields are mapped if needed
        baseImages: response.images && response.images.length > 0 ? {
          front: response.images[0]?.url,
          back: response.images[1]?.url || response.images[0]?.url,
          sleeve: response.images[2]?.url || response.images[0]?.url,
        } : { front: '', back: '', sleeve: '' }, // Fallback
      } as ProductDetail;
    }

    return response as unknown as ProductDetail;
  } catch (error) {
    // Fallback to variant ID lookup if slug fails
    try {
      return await productsApi.getByVariant(productId);
    } catch (variantError) {
      console.error('[Product API] Failed to get product by slug or variant:', { productId, error, variantError });
      throw variantError;
    }
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

