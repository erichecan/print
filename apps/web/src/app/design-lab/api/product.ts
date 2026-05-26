/**
 * Product API - 产品相关 API 封装
* 创建产品模块 API 封装
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
  imageUrls?: {
    front: string | null;
    back: string | null;
    left_sleeve: string | null;
    right_sleeve: string | null;
  };
}

export interface ProductDetail {
  productId: string;
  productName: string;
  slug: string;
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
  printableArea?: {
    front: { width: number; height: number; x: number; y: number };
    back: { width: number; height: number; x: number; y: number };
    sleeve: { width: number; height: number; x: number; y: number };
    'left-sleeve'?: { width: number; height: number; x: number; y: number };
    'right-sleeve'?: { width: number; height: number; x: number; y: number };
  } | null;
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
    const response: any = await productsApi.list({
      ...params,
      includeOutOfStock: true // Ensure consistent visibility with shop page
    });

    // Map backend response to Design Lab Product interface
    if (response && response.data) {
      const mappedData = response.data.map((item: any) => {
        // Image logic: Prefer White or Black variants, then primary, then first image
        const variants = item.variants || [];
        const whiteVariant = variants.find((v: any) => {
          const c = (v.color || '').toLowerCase();
          return c === 'white' || c === '白';
        });
        const blackVariant = variants.find((v: any) => {
          const c = (v.color || '').toLowerCase();
          return c === 'black' || c === '黑';
        });

        const coverImageUrl = whiteVariant?.imageUrl ||
          blackVariant?.imageUrl ||
          item.primaryImage?.url ||
          item.images?.[0]?.url ||
          item.coverImageUrl ||
          null;

        return {
          id: item.id,
          title: item.name || item.title || 'Untitled',
          slug: item.slug,
          // Handle price object from backend
          price: typeof item.price === 'object' ? (item.price.sale || item.price.base) : item.price,
          coverImageUrl,
          // Map category object to name
          category: typeof item.category === 'object' ? item.category.name : item.category
        };
      });

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
    // First try slug lookup (standard for Design Lab default)
    const response: any = await productsApi.getBySlug(productId);

    // The slug API returns { id, name, ... } but we need { productId, productName, ... }
    if (response && response.id) {
      return {
        ...response,
        productId: response.id,
        productName: response.name,
        slug: response.slug || productId,
        // Ensure other fields are mapped if needed
        baseImages: response.images && response.images.length > 0 ? {
          front: response.images[0]?.url,
          back: response.images[1]?.url,
          sleeve: response.images[2]?.url,
          'left-sleeve': response.images[2]?.url,
          'right-sleeve': response.images[3]?.url,
        } : { front: '', back: '', sleeve: '', 'left-sleeve': '', 'right-sleeve': '' }, // Fallback
        printableArea: response.printableArea || null, // Map from response
      };
    }

    return response as ProductDetail;
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
/**
 * 获取筛选选项统计数据
 */
export async function getFilterOptions(params?: { collection?: string; search?: string }): Promise<any> {
  try {
    const response = await productsApi.getFilterOptions(params);
    return response;
  } catch (error) {
    console.error('[Product API] Failed to get filter options:', error);
    throw error;
  }
}
