/**
 * API Client
* Restored complete API file and added product reviews API
* 使用集中管理的 API 配置
 */
import { API_BASE_URL } from './api-config';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: unknown; // Issue #105 - Replace any with unknown for type safety
  headers?: Record<string, string>;
}

// Typed checkout payment intent response
interface CheckoutPaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  breakdown?: {
    subtotal: number;
    promotionDiscount?: number; // 促销折扣
    discount?: number; // 总折扣（促销+优惠券）
    shipping: number;
    tax: number;
    total: number;
  };
  promotions?: Array<{ // 促销活动信息
    promotionId: string;
    promotionTitle: string;
    productId: string;
    discountAmount: number;
  }>;
  coupon?: { // 添加优惠券信息
    id: string;
    code: string;
    type: string;
  };
}

// Typed checkout confirm response
interface CheckoutConfirmResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  email: string;
}

// Cart response types
export interface CartItemResponse {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  variantDescription: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  thumbnail: string | null;
}

export interface CartResponse {
  items: CartItemResponse[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  itemCount: number;
}

// Product type for related products API
export interface Product {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  basePrice: number | string;
  sku: string;
  images?: Array<{
    id: string;
    url: string;
    alt?: string | null;
    sortOrder: number;
  }>;
  variants?: Array<{
    id: string;
    sku: string;
    stockQuantity: number;
  }>;
  // 促销活动信息
  promotions?: Promotion[];
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// Product Review types
export interface ProductReview {
  id: string;
  productId?: string;
  userId?: string | null;
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  helpfulCount?: number;
  createdAt: string;
  updatedAt?: string;
  user?: {
    id?: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string;
  } | null;
}

export interface ProductReviewSummary {
  average: number;
  total: number;
  counts: {
    '5': number;
    '4': number;
    '3': number;
    '2': number;
    '1': number;
  };
}

// Issue #105 - Common pagination response type
export interface PaginationResponse {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ProductReviewsResponse {
  reviews: ProductReview[];
  summary: ProductReviewSummary;
  pagination?: PaginationResponse;
}

export interface ProductReviewPayload {
  rating: number;
  title: string;
  comment: string;
  productId: string;
  orderId?: string;
}

// Checkout address payload
export interface CheckoutAddressPayload {
  fullName: string;
  email: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

// User profile type
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role?: string; // 添加角色字段
  emailVerified?: boolean; // 添加邮箱验证字段
  createdAt?: string;
  updatedAt?: string;
}

// Order detail type
export interface AccountOrderDetail {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  shippingAddress?: CheckoutAddressPayload | null; // Issue #105 - Replace any with proper type
  billingAddress?: CheckoutAddressPayload | null; // Issue #105 - Replace any with proper type
  items: Array<{
    id: string;
    sku: string;
    productName: string;
    variantDescription: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    thumbnail?: string | null;
  }>;
  shipments?: Array<{
    id: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    status: string;
    labelUrl?: string | null;
    createdAt: string;
  }>;
}

// Address types
export interface Address {
  id: string;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  address1: string;
  address2: string | null;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AddressPayload {
  firstName: string;
  lastName: string;
  company?: string;
  address1: string;
  address2?: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
}

// 需要认证的 API 路径前缀
// 增加 /sales 以支持 Sales 订单管理
const AUTH_REQUIRED_PATHS = [
  '/orders',
  '/admin',
  '/auth/me',
  '/addresses',
  '/designs',
  '/cart',
  '/sales',
];

/**
 * 检查路径是否需要认证（使用代理路由）
 */
function requiresAuthProxy(path: string): boolean {
  // Fix: In development mode, bypass the proxy for cart operations to avoid
  // "Proxy request failed" 500 errors. Allow direct communication with localhost:3001
  // which handles cookies/sessions natively on the same domain/IP in dev.
  if (process.env.NODE_ENV === 'development') {
    // We can be more aggressive and bypass proxy for everything in dev if the backend is local
    // But let's target the reported issue (cart) specifically or generally.
    // If we return false here, `api()` function uses API_BASE_URL (which we forced to localhost:3001 in env.ts)
    // and sends { credentials: 'include' }. This is the correct way for local dev.
    return false;
  }
  return AUTH_REQUIRED_PATHS.some(prefix => path.startsWith(prefix));
}

export async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  // 添加超时控制和取消支持
  const { method = 'GET', body, headers = {} } = options;
  const timeout = 120000; // 120秒超时

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  // 检查是否需要使用代理路由
  // 修复：如果 endpoint 已经包含 /api/proxy，直接使用，避免重复拼接
  const alreadyHasProxy = endpoint.startsWith('/api/proxy');
  const useProxy = !alreadyHasProxy && requiresAuthProxy(endpoint);

  // 确定请求 URL
  // 修复：如果 endpoint 已经包含 /api/proxy，直接使用 window.location.origin（客户端）或相对路径（SSR）
  let requestUrl: string;
  if (alreadyHasProxy) {
    // endpoint 已经包含 /api/proxy，直接使用相对路径（Next.js 会处理）
    requestUrl = endpoint;
  } else if (useProxy) {
    // 需要代理，添加 /api/proxy 前缀
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
    requestUrl = `${baseUrl}/api/proxy${endpoint}`;
  } else {
    // 不需要代理，直接使用 API_BASE_URL
    // 修复：开发环境中使用与页面相同的主机名，避免 127.0.0.1 vs localhost 跨站 cookie 问题
    // SameSite=Lax cookie 在跨站 fetch 中不会发送，导致每次请求产生不同 sessionId
    let effectiveBaseUrl = API_BASE_URL;
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
      const host = window.location.hostname;
      effectiveBaseUrl = `http://${host}:3001/api`;
    }
    requestUrl = `${effectiveBaseUrl}${endpoint}`;
    if (process.env.NODE_ENV === 'development') {
      console.log('[API Debug] requestUrl:', requestUrl, 'effectiveBaseUrl:', effectiveBaseUrl, 'endpoint:', endpoint);
    }
  }

  // 从 localStorage 读取 token 并添加到 Authorization header
  const token = getToken();

  // 创建 AbortController 用于超时和取消
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const config: RequestInit = {
    method,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      // 如果存在 token，添加到 Authorization header
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    },
    // 添加 signal 用于取消请求
    signal: controller.signal,
    // 修复：购物车 API 需要 sessionId cookie，必须包含 credentials
    credentials: 'include',
  };

  if (body && method !== 'GET') {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, config);
    clearTimeout(timeoutId);
  } catch (error: unknown) {
    clearTimeout(timeoutId);

    // 处理网络错误（连接被拒绝、空响应等）
    // 统一错误处理，包含超时错误
    if (error instanceof TypeError || (error as any)?.name === 'AbortError') {
      const errorMessage = (error as any)?.message || '';
      if (errorMessage.includes('aborted') || (error as any)?.name === 'AbortError') {
        throw new Error(`请求超时（${timeout}ms）。请稍后重试。`);
      }
      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch') || errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        // 本地开发环境：提供更友好的错误提示
        const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        if (isLocalhost) {
          throw new Error('无法连接到后端服务器。请确保后端服务器正在运行（端口 3001）。运行命令：cd backend && npm run dev');
        }
        throw new Error('网络错误：无法连接到服务器。请稍后重试。');
      }
    }
    throw error;
  }

  // 处理空响应
  // 统一错误处理，提取 traceId 和错误码
  if (!response || !response.ok) {
    let errorMessage = `API Error: ${response?.status || 'Unknown'}`;
    let errorDetails: { error?: { code?: string; message?: string; details?: string | Record<string, unknown> }; message?: string; details?: string | Record<string, unknown>; traceId?: string } | null = null;
    let traceId: string | undefined;

    try {
      const errorText = await response.text();
      if (errorText) {
        try {
          errorDetails = JSON.parse(errorText);
          // 提取标准错误格式
          if (errorDetails && errorDetails.error) {
            errorMessage = typeof errorDetails.error === 'string'
              ? errorDetails.error
              : (errorDetails.error.message || errorMessage);
            traceId = errorDetails.traceId;
          } else if (errorDetails) {
            errorMessage = typeof errorDetails.error === 'string'
              ? errorDetails.error
              : (errorDetails.message || errorMessage);
            traceId = errorDetails.traceId;
          }
          // 如果有详细信息，添加到错误消息中
          if (errorDetails && errorDetails.details && process.env.NODE_ENV === 'development') {
            const detailsStr = typeof errorDetails.details === 'string'
              ? errorDetails.details
              : JSON.stringify(errorDetails.details);
            errorMessage += `: ${detailsStr}`;
          }
        } catch {
          // 如果不是 JSON，使用原始文本
          errorMessage = errorText || response?.statusText || 'Unknown error';
        }
      } else {
        errorMessage = response?.statusText || 'Network error: Empty response from server';
      }
    } catch {
      // 如果无法读取响应，使用状态文本
      errorMessage = response?.statusText || 'Network error: Empty response from server';
    }

    // 从响应头提取 traceId
    if (!traceId) {
      traceId = response.headers.get('X-Trace-Id') || response.headers.get('X-Request-Id') || undefined;
    }

    // 添加更详细的错误信息用于调试
    const fullError = new Error(errorMessage);
    (fullError as any).status = response?.status;
    (fullError as any).details = errorDetails;
    (fullError as any).traceId = traceId;
    (fullError as any).errorCode = errorDetails?.error?.code;
    throw fullError;
  }

  // 处理空响应体
  const text = await response.text();
  if (!text || text.trim() === '') {
    throw new Error('Empty response from server');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON response: ${text.substring(0, 100)}`);
  }
}

// Filter options types
export interface FilterOptions {
  categories: Array<{
    id: string;
    name: string;
    slug: string;
    count: number;
    children: Array<{
      id: string;
      name: string;
      slug: string;
      count: number;
    }>;
  }>;
  brands: Array<{
    name: string;
    slug: string;
    count: number;
  }>;
  colors: Array<{
    name: string;
    hex: string;
    count: number;
  }>;
  sizes: Array<{
    name: string;
    count: number;
  }>;
  priceRanges: Array<{
    name: string;
    count: number;
  }>;
  priceRange: {
    min: number;
    max: number;
  };
  fit: Array<{ name: string; count: number }>;
  decoration: Array<{ name: string; count: number }>;
  material: Array<{ name: string; count: number }>;
  type: Array<{ name: string; count: number }>;
  style: Array<{ name: string; count: number }>;
  neckline: Array<{ name: string; count: number }>;
  features: Array<{ name: string; count: number }>;
  rushDelivery: Array<{ name: string; label?: string; count: number }>;
}

// Products API
export const productsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    category?: string;
    search?: string;
    sort?: string;
    includeOutOfStock?: boolean;
    collection?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.collection) query.append('collection', params.collection);
    if (params?.includeOutOfStock !== undefined) {
      query.append('includeOutOfStock', params.includeOutOfStock ? 'true' : 'false');
    }
    const queryString = query.toString();
    return api(`/products${queryString ? `?${queryString}` : ''}`);
  },
  // 获取筛选选项统计数据
  getFilterOptions: (params?: { collection?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.collection) query.append('collection', params.collection);
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString();
    return api<FilterOptions>(`/products/filters/options${queryString ? `?${queryString}` : ''}`);
  },
  getBySlug: (slug: string) => api(`/products/${slug}`),
  // 根据 variantId 获取产品信息（用于 Design Lab）
  getByVariant: (variantId: string) => api<{
    productId: string;
    productName: string;
    slug: string;
    variantId: string;
    color: string | null;
    colors: string[];
    colorDetails?: Array<{
      name: string;
      hex: string;
      availableSizes: string[];
      isAvailable: boolean;
    }>;
    variants?: Array<{
      id: string;
      color: string | null;
      colorHex: string | null;
      size: string | null;
      stockQuantity: number;
      priceAdjustment?: number; // Add price adjustment
    }>;
    baseImages: {
      front: string;
      back: string;
      sleeve: string;
    };
    gallery: string[];
  }>(`/products/variant/${variantId}`),
  getRelated: (slug: string, limit?: number) => {
    const query = limit ? `?limit=${limit}` : '';
    return api<{ data: Product[] }>(`/products/${slug}/related${query}`);
  },
  getReviews: (productId: string, page?: number, limit?: number) => {
    const query = new URLSearchParams();
    if (page) query.append('page', page.toString());
    if (limit) query.append('limit', limit.toString());
    const queryString = query.toString();
    return api<ProductReviewsResponse>(`/products/${productId}/reviews${queryString ? `?${queryString}` : ''}`);
  },
  submitReview: (data: ProductReviewPayload) =>
    api<ProductReview>(`/products/${data.productId}/reviews`, {
      method: 'POST',
      body: data,
    }), // 提交产品评价API（需要后端实现）
  // 获取指定品牌的其它商品列表
  getBrandProducts: (brandId: string, excludeProductId?: string, limit?: number) => {
    const query = new URLSearchParams();
    if (excludeProductId) query.append('excludeProductId', excludeProductId);
    if (limit) query.append('limit', limit.toString());
    const queryString = query.toString();
    return api<{
      items: Array<{
        id: string;
        title: string;
        slug: string;
        price: number;
        coverImageUrl: string | null;
      }>;
      brand: {
        id: string;
        name: string;
        slug: string;
      };
    }>(`/brands/${brandId}/products${queryString ? `?${queryString}` : ''}`);
  },
};

// Collections API
export const collectionsApi = {
  list: () => api('/collections'),
  getBySlug: (slug: string) => api(`/collections/${slug}`),
};

// Categories API (Public)
export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  sortOrder: number;
}

export const categoriesApi = {
  list: () => api<{ data: Category[] }>('/categories'),
  getBySlug: (slug: string) => api<Category>(`/categories/${slug}`),
};

// Cart API
// 添加详细日志，修复购物车功能
export const cartApi = {
  get: async () => {
    console.log('[Cart API] get() called');
    try {
      const result = await api<CartResponse>('/cart');
      console.log('[Cart API] get() success:', { itemCount: result?.itemCount || 0 });
      return result;
    } catch (error) {
      console.error('[Cart API] get() error:', error);
      throw error;
    }
  },
  addItem: async (variantId: string, quantity: number = 1, designId?: string, sizeBreakdown?: any, metadata?: any) => {
    console.log('[Cart API] addItem() called:', { variantId, quantity, designId, sizeBreakdown });
    try {
      const result = await api('/cart/items', {
        method: 'POST',
        body: {
          variantId,
          quantity,
          ...(designId && { designId }),
          ...(sizeBreakdown && { sizeBreakdown }),
          ...(metadata && { metadata })
        }
      });
      console.log('[Cart API] addItem() success:', result);
      return result;
    } catch (error) {
      console.error('[Cart API] addItem() error:', error);
      throw error;
    }
  },
  updateItem: async (itemId: string, quantity: number) => {
    console.log('[Cart API] updateItem() called:', { itemId, quantity });
    try {
      const result = await api(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } });
      console.log('[Cart API] updateItem() success:', result);
      return result;
    } catch (error) {
      console.error('[Cart API] updateItem() error:', error);
      throw error;
    }
  },
  removeItem: async (itemId: string) => {
    console.log('[Cart API] removeItem() called:', { itemId });
    try {
      const result = await api(`/cart/items/${itemId}`, { method: 'DELETE' });
      console.log('[Cart API] removeItem() success:', result);
      return result;
    } catch (error) {
      console.error('[Cart API] removeItem() error:', error);
      throw error;
    }
  },
  clear: async () => {
    console.log('[Cart API] clear() called');
    try {
      const result = await api('/cart', { method: 'DELETE' });
      console.log('[Cart API] clear() success:', result);
      return result;
    } catch (error) {
      console.error('[Cart API] clear() error:', error);
      throw error;
    }
  },
};

// Checkout API
export const checkoutApi = {
  prepare: (payload?: { shippingAddress?: CheckoutAddressPayload; shippingMethod?: string; couponCode?: string }) =>
    api('/checkout/prepare', {
      method: 'POST',
      ...(payload ? { body: payload } : {}),
    }),
  getShippingRates: (address: Partial<CheckoutAddressPayload>, cartItems?: any[]) => // Issue #105 - Replace any with proper type
    api('/checkout/shipping-rates', { method: 'POST', body: { address, cartItems } }),
  // 添加优惠券支持
  // Enhanced: Added draftOrderId, amount, currency, customerEmail, metadata
  createPaymentIntent: (
    shippingAddress: CheckoutAddressPayload,
    shippingMethod: string = 'standard',
    couponCode?: string,
    couponId?: string,
    draftOrderId?: string,
    amount?: number,
    currency?: string,
    customerEmail?: string,
    metadata?: Record<string, unknown>,
    referralCode?: string
  ) =>
    api<CheckoutPaymentIntentResponse>('/checkout/create-payment-intent', {
      method: 'POST',
      body: {
        shippingAddress,
        shippingMethod,
        ...(couponCode ? { couponCode } : {}),
        ...(couponId ? { couponId } : {}),
        ...(draftOrderId ? { draftOrderId } : {}),
        ...(amount !== undefined ? { amount } : {}),
        ...(currency ? { currency } : {}),
        ...(customerEmail ? { customerEmail } : {}),
        ...(metadata ? { metadata } : {}),
        ...(referralCode ? { referralCode } : {}),
      },
    }),
  // 添加优惠券支持
  confirm: (
    paymentIntentId: string,
    shippingAddress: CheckoutAddressPayload,
    billingAddress: CheckoutAddressPayload,
    shippingMethod: string,
    email: string,
    couponCode?: string,
    couponId?: string,
    referralCode?: string,
    clientId?: string
  ) =>
    api<CheckoutConfirmResponse>('/checkout/confirm', {
      method: 'POST',
      body: {
        paymentIntentId,
        shippingAddress,
        billingAddress,
        shippingMethod,
        email,
        ...(couponCode ? { couponCode } : {}),
        ...(couponId ? { couponId } : {}),
        ...(referralCode ? { referralCode } : {}),
        ...(clientId ? { clientId } : {}),
      },
    }),
  devOrder: (email: string, shippingAddress: CheckoutAddressPayload) =>
    api<CheckoutConfirmResponse>('/checkout/dev-order', {
      method: 'POST',
      body: {
        email,
        shippingAddress: {
          firstName: shippingAddress.firstName || 'Dev',
          lastName: shippingAddress.lastName || 'Test',
          addressLine1: shippingAddress.addressLine1 || '123 Dev Street',
          city: shippingAddress.city || 'Toronto',
          province: shippingAddress.province || 'ON',
          postalCode: shippingAddress.postalCode || 'M5V 3A8',
          country: shippingAddress.country || 'CA',
          phone: shippingAddress.phone || '4161234567',
        },
      },
    }),
};

// Designs API (User)
export interface UserDesign {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt?: string; // 新增：最后编辑时间
  productName?: string | null;
}

export const designsApi = {
  // 支持时间筛选参数 days
  list: (days?: number) => {
    const query = days && days > 0 ? `?days=${days}` : '';
    return api<{ designs: UserDesign[]; total: number }>(`/user/designs${query}`);
  },
  get: (id: string) => api<{ data: DesignDraft }>(`/designs/${id}`), // Issue #105 - Replace any with proper type
  delete: (id: string) => api(`/designs/${id}`, { method: 'DELETE' }),
};

// Orders API
// Enhanced with search, paymentStatus filter, and proper sorting
export const ordersApi = {
  list: (
    page: number = 1,
    limit: number = 20,
    status?: string,
    sort?: string,
    search?: string,
    paymentStatus?: string
  ) => {
    const query = new URLSearchParams();
    query.append('page', page.toString());
    query.append('limit', limit.toString());
    if (status) query.append('status', status);
    if (paymentStatus) query.append('paymentStatus', paymentStatus);
    if (search) query.append('search', search);
    // Parse sort parameter (format: "field_order" e.g., "createdAt_desc")
    if (sort) {
      const [sortBy, sortOrder] = sort.split('_');
      if (sortBy) query.append('sortBy', sortBy);
      if (sortOrder) query.append('sortOrder', sortOrder);
    }
    return api<{ orders: AccountOrderDetail[]; pagination?: PaginationResponse } | { data: AccountOrderDetail[]; pagination?: PaginationResponse }>(`/orders?${query.toString()}`); // Issue #105 - Replace any with proper type
  },
  getById: (id: string) => api<AccountOrderDetail>(`/orders/${id}`),
  // [2026-01-27] 移除 email 参数，改为需要登录认证
  getByOrderNumber: (orderNumber: string) =>
    api<AccountOrderDetail>(`/orders/number/${orderNumber}`),
  downloadInvoice: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/invoice`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }
    return response.blob();
  },
  downloadInvoiceByOrderNumber: async (orderNumber: string, email: string) => {
    const response = await fetch(
      `${API_BASE_URL}/orders/number/${orderNumber}/invoice?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        credentials: 'include',
      }
    );
    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }
    return response.blob();
  },
  cancel: (id: string, reason?: string) =>
    api<AccountOrderDetail>(`/orders/${id}/cancel`, {
      method: 'POST',
      body: reason ? { reason } : {},
    }),
  getTracking: (id: string) =>
    api<{
      orderNumber: string;
      status: string;
      trackingNumber?: string | null;
      carrier?: string | null;
      estimatedDelivery?: string | null;
      shipments: Array<{
        id: string;
        trackingNumber?: string | null;
        carrier?: string | null;
        status: string;
        labelUrl?: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
      events: Array<{
        date: string;
        location?: string | null;
        status: string;
        description: string;
      }>;
      lastUpdated: string;
    }>(`/orders/${id}/tracking`),
};

// Auth API
// 创建同域 API 调用函数（用于登录相关请求，避免跨域 Cookie 问题）
// 从 sessionStorage 获取 token（sessionStorage 随 tab 关闭自动清除，防止会话共享）
// 兼容旧版本：如果 sessionStorage 中没有 token，尝试从 localStorage 读取（迁移兼容）
function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem('auth_token') || localStorage.getItem('auth_token');
  } catch (e) {
    console.error('[API] Error reading token from storage:', e);
    return null;
  }
}

// 保存 token 到 sessionStorage 和 localStorage（sessionStorage 随 tab 关闭自动清除；
// localStorage 跨 tab 可访问，确保在新标签页打开表单时仍能读取 token）
export function setAuthToken(token: string): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('auth_token', token);
    localStorage.setItem('auth_token', token);
  } catch (e) {
    console.error('[API] Error saving token to storage:', e);
  }
}

// 清除 token
export function clearAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem('auth_token');
    localStorage.removeItem('auth_token'); // 兼容旧版本残留
  } catch (e) {
    console.error('[API] Error clearing token from sessionStorage:', e);
  }
}

// 导出 getToken 函数供外部使用
export function getAuthToken(): string | null {
  return getToken();
}

// 创建带认证的 fetch 辅助函数
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function sameOriginApi<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  // 修复：同时支持 Cookie 和 Authorization header
  // 从 localStorage 读取 token 并添加到 Authorization header
  const token = getToken();

  const config: RequestInit = {
    method,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      // 修复：如果存在 token，添加到 Authorization header
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...headers,
    },
    // 修复：添加 credentials: 'include' 以传递 Cookie
    // 后端 authenticate 中间件会优先从 Cookie 读取 token，如果没有则从 Authorization header 读取
    credentials: 'include',
  };

  if (body && method !== 'GET') {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  // 使用同源 API 路由（Next.js API Routes）
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}${endpoint}`, config);

  if (!response.ok) {
    // 对于 401 错误，抛出特殊错误以便调用方识别
    if (response.status === 401) {
      // 401 错误时清除 token
      clearAuthToken();
      const error = new Error('UNAUTHORIZED');
      (error as Error & { status?: number }).status = 401;
      throw error;
    }
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  const contentType = response.headers.get('content-type');
  if (contentType?.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text as unknown as T;
}

export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api('/auth/register', { method: 'POST', body: data }),
  // 登录后保存 token 到 localStorage
  login: async (email: string, password: string) => {
    const response = await sameOriginApi<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: { email, password }
    });
    // 保存 token 到 localStorage
    if (response.token) {
      setAuthToken(response.token);
    }
    return response;
  },
  logout: async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } finally {
      // Verify fix: explicitly clear local token to prevent auto-relogin
      clearAuthToken();
    }
  },
  // 使用同域 API 路由，避免跨域 Cookie 问题
  // 静默处理 401 错误（未登录是正常状态）
  me: async () => {
    try {
      return await sameOriginApi<UserProfile>('/api/auth/me');
    } catch (err: unknown) { // Issue #105 - Replace any with unknown for type safety
      // 401 错误表示用户未登录，这是正常状态，不抛出错误
      const error = err instanceof Error ? err : new Error(String(err));
      if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
        throw new Error('UNAUTHORIZED'); // 使用特殊错误标识，让调用方可以区分
      }
      throw err;
    }
  },
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    api('/auth/me', { method: 'PUT', body: data }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api('/auth/me/password', { method: 'PUT', body: data }), // 密码修改API路径修复为PUT /auth/me/password
  forgotPassword: (email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

// Sales Offline Orders API
export interface SalesOfflineOrderSummary {
  id: string;
  orderCode: string;
  projectName: string;
  primaryProduct: string | null;
  quantity: number | null;
  deliveryDate: string | null;
  description: string | null;
  status: string;
  rushOrder: boolean;
  rushFee?: number;
  stage: {
    key: string | null;
    label: string | null;
    position: number | null;
  } | null;
  contact: {
    name: string;
    company: string | null;
    email: string;
    phone: string | null;
  };
  // 创建者信息（用于销售主管查看）
  creator?: {
    id: string;
    email: string;
    name: string;
  } | null;
  configuration?: any; // PRD v2.0
  payment?: {
    method: string | null;
    referenceNumber: string | null;
    depositAmount: number;
    dstFileFee: number;
  };
  dst_file_fee?: number | string | null; // PRD v2.0
  order_notes?: string | null; // PRD v2.0
  payment_method?: string | null; // PRD v2.0
  reference_number?: string | null; // PRD v2.0
  // 2026-04-20: 列表改造新增字段
  type?: string | null;
  // [2026-07-31] 订单类别：烫印服装 / DTF打印film
  orderCategory?: string | null;
  invoiceStatus?: 'No' | 'Require' | 'Sent' | string;
  totalAmount?: number | null;
  // 2026-04-24: 备货/订货情况
  stockingStatus?: string | null;
  purchaseStatus?: string | null;
  // [2026-07-31] 手动"从报表排除"开关
  excludeFromReports?: boolean;
  // 列表 include assets：首张 image 作为缩略图，其余供下载浮层
  assets?: Array<{
    id: string;
    fileName: string;
    fileSize?: number | null;
    contentType?: string | null;
    url: string;
    uploadedAt?: string;
    comment?: string | null;
  }>;
  productionWorkOrder?: {
    id?: string;
    status?: string;
    startDate?: string | null;
    dueDate?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

// 2026-04-20: 订单状态字典（20 条系统预置 + 用户自定义）
export interface OfflineOrderStatusOption {
  id: string;
  value: string;
  label: string;
  sortOrder: number;
  isSystem: boolean;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SalesOfflineOrderListResponse {
  data: SalesOfflineOrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 订单配置数据结构类型定义
export interface OfflineOrderProductItem {
  id: string;
  productId?: string; // PRD v2.0
  productName?: string; // PRD v2.0
  categoryId: string;
  categoryName: string;
  variants: Array<{
    size: string;
    color: string;
    quantity: number;
    unitPrice: number;
  }>;
}

export interface OfflineOrderPrintPosition {
  productItemId?: string;
  categoryId?: string;
  categoryName?: string;
  position: string;
  method?: string; // DTF, Embroidery, etc.
  width: string;
  height: string;
  widthMm?: number; // Added for precision
  heightMm?: number; // Added for precision
  notes: string;
  dstFileFee?: number;
  index?: number;
}

export interface OfflineOrderPricing {
  subtotal: number;
  discount: number;
  discountAmount: number;
  dstFileFee?: number; // PRD v2.0
  rushFee?: number; // Added
  taxRate?: number; // PRD v2.0
  taxAmount?: number; // PRD v2.0
  total: number;
  currency: string;
}

export interface OfflineOrderInvoiceInfo {
  companyName: string;
  companyEmail: string;
  taxNumber: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  paymentMethod?: string;
  referenceNumber?: string;
}

export interface OfflineOrderConfiguration {
  source?: string;
  orderCode?: string;
  artworkNotes?: string;
  orderNotes?: string; // PRD v2.0
  productItems?: OfflineOrderProductItem[];
  colorGroupsByProduct?: Record<string, any[]>; // PRD v2.0: OrderItemColorGroup[]
  dstFileFee?: number; // PRD v2.0: Total DST fee
  sideCount?: number;
  printPositions?: OfflineOrderPrintPosition[];
  requiresInvoice?: boolean;
  invoiceInfo?: OfflineOrderInvoiceInfo | null;
  pricing?: OfflineOrderPricing;
  paymentMethod?: string;
  referenceNumber?: string;
  depositAmount?: number;
  sizeFees?: OfflineOrderSizeFee[];
}

export interface SalesOfflineOrderDetail extends SalesOfflineOrderSummary {
  // 详情接口包含的额外字段
  description?: string | null; // 设计说明
  requiresMockups?: boolean;
  requiresProof?: boolean;
  configuration?: OfflineOrderConfiguration | null; // 完整配置信息
  metadata?: Record<string, unknown>; // Issue #105 - Replace any with proper type
  assets: Array<{
    id: string;
    fileName: string;
    url: string;
    fileSize?: number;
    comment?: string | null;
    [key: string]: unknown
  }>;
  histories: Array<{
    id: string;
    action: string;
    timestamp: string;
    note?: string;
    operator?: string;
    [key: string]: any
  }>;
  productionWorkOrder: {
    id: string;
    status: string;
    workOrderCode?: string;
    assignee?: { name: string };
    startDate?: string;
    dueDate?: string;
    [key: string]: any
  } | null;
  auditLogs: OfflineOrderAuditLogEntry[];
}

export const salesOrdersApi = {
  list: (params?: { page?: number; limit?: number; search?: string; creatorId?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    if (params?.search) query.append('search', params.search);
    if (params?.creatorId) query.append('creatorId', params.creatorId);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString();
    return api<SalesOfflineOrderListResponse>(`/sales/orders${qs ? `?${qs}` : ''}`);
  },
  // 获取销售人员/创建者列表
  getCreators: () => api<{ data: Array<{ id: string; name: string; email: string; role: string }> }>('/sales/orders/creators'),
  get: (id: string) =>
    api<{ order: SalesOfflineOrderDetail } | SalesOfflineOrderDetail>(`/sales/orders/${id}`).then((res) => {
      // 修复：处理两种可能的返回格式
      // 格式1: { order: SalesOfflineOrderDetail }
      // 格式2: SalesOfflineOrderDetail (直接返回订单对象)
      if (res && typeof res === 'object' && 'order' in res) {
        if (!res.order) {
          throw new Error('订单不存在或已被删除');
        }
        return res.order;
      }
      // 如果直接返回订单对象
      if (res && typeof res === 'object' && 'id' in res) {
        return res as SalesOfflineOrderDetail;
      }
      throw new Error('订单不存在或已被删除');
    }),
  // 更新订单阶段
  updateStage: (id: string, data: { stageKey: string; note?: string }) =>
    api<{ success: boolean; order: SalesOfflineOrderDetail }>(`/sales/orders/${id}/stage`, {
      method: 'PATCH',
      body: data,
    }),
  // 更新订单状态
  // 2026-04-20: status 改为自由文本（含自定义选项）
  updateStatus: (id: string, status: string, rushOrder?: boolean) => {
    const body: { status: string; rushOrder?: boolean } = { status };
    if (rushOrder !== undefined) {
      body.rushOrder = rushOrder;
    }
    return api(`/sales/orders/${id}/status`, {
      method: 'PATCH',
      body,
    });
  },
  // 删除订单
  delete: (id: string) =>
    api(`/admin/offline-orders/${id}`, {
      method: 'DELETE',
    }),
};

// 2026-04-20: 订单管理列表改造 —
// 通用的 PATCH / POST 接口，支持宽屏表格 inline 编辑与新增
export const offlineOrdersInlineApi = {
  // Inline 更新单个字段（status / type / invoiceStatus / totalAmount / rushOrder / ...）
  patch: (id: string, patch: Record<string, unknown>) =>
    api<{ success: boolean; order: any }>(`/admin/offline-orders/${id}`, {
      method: 'PATCH',
      body: patch as any,
    }),
  // Inline 新增一行（最小载荷，所有字段都可选）
  create: (payload: Record<string, unknown>) =>
    api<{ success: boolean; order: any }>(`/offline-orders`, {
      method: 'POST',
      body: payload as any,
    }),
};

// 2026-04-20: 状态选项字典客户端
export const statusOptionsApi = {
  list: () =>
    api<{ success: boolean; options: OfflineOrderStatusOption[] }>(
      `/admin/offline-orders/status-options`
    ),
  create: (value: string, label?: string) =>
    api<{ success: boolean; option: OfflineOrderStatusOption }>(
      `/admin/offline-orders/status-options`,
      {
        method: 'POST',
        body: { value, label } as any,
      }
    ),
  delete: (id: string) =>
    api<{ success: boolean }>(`/admin/offline-orders/status-options/${id}`, {
      method: 'DELETE',
    }),
};

// Offline Order Product Configuration API
// 重构：更新接口定义以匹配后端返回格式
// 获取线下订单配置数据（产品、颜色、尺寸费用、可用性等）
export interface OfflineOrderProduct {
  id: string;
  name: string;
  imageUrl?: string | null;
  isCustomerOwned: boolean;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfflineOrderColor {
  id: string;
  name: string;
  hexCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface OfflineOrderSizeFee {
  id?: string;              // 尺码ID（可选，用于创建时）
  size: string;              // 尺码名称（可修改）
  sizeType?: 'Youth' | 'Adult' | 'Other';  // 尺码类型
  additionalFee: number;     // 额外费用
  displayOrder?: number;     // 显示顺序
  isActive?: boolean;        // 是否启用
}

export interface OfflineOrderAvailability {
  productId: string;
  colorId: string;
  size: string;
  available: boolean;
}

export interface OfflineOrderConfig {
  products: OfflineOrderProduct[];
  colors: OfflineOrderColor[];
  sizeFees: OfflineOrderSizeFee[];
  availability: OfflineOrderAvailability[];
}

// 简化的产品 API
export interface SimpleOfflineOrderProduct {
  id: string;
  name: string;
  imageUrl?: string | null;
  isCustomerOwned: boolean;
  displayOrder?: number;
  isActive?: boolean;
  unitCost?: number;
  categoryId?: string | null;
  categoryName?: string | null;
  supplierId?: string | null;
  supplierName?: string | null;
  sku?: string | null;
  stockQuantity?: number;
  createdAt?: string;
  updatedAt?: string;
}

export const simpleOfflineOrderProductApi = {
  // 获取产品列表（用于下拉菜单）
  list: () => sameOriginApi<{ success: boolean; data: SimpleOfflineOrderProduct[] }>('/api/offline-orders/products'),
  // 管理接口
  listAll: () => sameOriginApi<{ success: boolean; data: SimpleOfflineOrderProduct[] }>('/api/proxy/admin/offline-order-products'),
  create: (product: {
    name: string;
    imageUrl?: string;
    isCustomerOwned?: boolean;
    displayOrder?: number;
    unitCost?: number;
    categoryId: string;
    supplierId?: string;
    sku?: string;
    stockQuantity?: number;
  }) =>
    sameOriginApi<{ success: boolean; data: SimpleOfflineOrderProduct }>('/api/proxy/admin/offline-order-products', {
      method: 'POST',
      body: product,
    }),
  update: (
    id: string,
    product: {
      name?: string;
      imageUrl?: string;
      isCustomerOwned?: boolean;
      displayOrder?: number;
      isActive?: boolean;
      unitCost?: number;
      categoryId?: string;
      supplierId?: string | null;
      sku?: string | null;
      stockQuantity?: number;
    }
  ) =>
    sameOriginApi<{ success: boolean; data: SimpleOfflineOrderProduct }>(`/api/proxy/admin/offline-order-products/${id}`, {
      method: 'PATCH',
      body: product,
    }),
  delete: (id: string) =>
    sameOriginApi<{ success: boolean; message: string }>(`/api/proxy/admin/offline-order-products/${id}`, {
      method: 'DELETE',
    }),
};

export const offlineOrderProductApi = {
  // PRD v2.0: 获取订单配置数据
  getOrderConfig: () => sameOriginApi<{ data: OfflineOrderConfig }>('/api/offline-orders/config'),
};

// Address API
export const addressesApi = {
  list: () => api<Address[]>('/addresses'),
  get: (id: string) => api<Address>(`/addresses/${id}`),
  create: (data: AddressPayload) => api<Address>('/addresses', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AddressPayload>) =>
    api<Address>(`/addresses/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/addresses/${id}`, { method: 'DELETE' }),
  setDefault: (id: string) => api<Address>(`/addresses/${id}/set-default`, { method: 'PATCH' }), // 修复API方法为PATCH
};

// User Preferences API Types
export interface UserPreferences {
  emailNotifications: {
    orderUpdates: boolean;
    promotions: boolean;
    newsletters: boolean;
    productUpdates: boolean;
  };
  smsNotifications: {
    orderUpdates: boolean;
    promotions: boolean;
  };
  privacy: {
    profileVisible: boolean;
    showEmail: boolean;
    showPhone: boolean;
  };
}

export interface UserPreferencesResponse {
  preferences: UserPreferences;
  updatedAt: string | null;
}

// User Preferences API
export const userPreferencesApi = {
  get: () => api<UserPreferencesResponse>('/user/preferences'),
  update: (data: Partial<UserPreferences>) =>
    api<UserPreferencesResponse>('/user/preferences', { method: 'PUT', body: data }),
};

// Admin API Types
export interface AdminCategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
  filterTags: string[];
  parent?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    products: number;
    children: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminCategoryDetail extends AdminCategorySummary {
  parent?: {
    id: string;
    name: string;
  } | null;
  children?: Array<{
    id: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
  }>;
}

export interface AdminCategoryPayload {
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  filterTags?: string[];
}

export interface TagGroup {
  id: string;
  name: string;
  slug: string;
  tags: string[];
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface TagGroupPayload {
  name: string;
  slug: string;
  tags: string[];
  sortOrder?: number;
  isActive?: boolean;
}

export const tagGroupsApi = {
  list: () => api<TagGroup[]>('/tag-groups'),
  get: (id: string) => api<TagGroup>(`/tag-groups/${id}`),
  create: (data: TagGroupPayload) =>
    api<TagGroup>('/tag-groups', { method: 'POST', body: data }),
  update: (id: string, data: Partial<TagGroupPayload>) =>
    api<TagGroup>(`/tag-groups/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) =>
    api<{ success: boolean }>(`/tag-groups/${id}`, { method: 'DELETE' }),
};

export interface AdminProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string;
  basePrice: number;
  salePrice?: number | null;
  stockQuantity: number;
  isActive: boolean;
  isCustomizable: boolean;
  tags?: string[];
  category?: {
    id: string;
    name: string;
  } | null;
  primaryImage?: {
    url: string;
    alt?: string | null;
  } | null;
  images?: Array<{
    id: string;
    url: string;
    alt?: string | null;
    sortOrder?: number;
  }> | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminProductDetail extends AdminProductSummary {
  description?: string | null;
  longDescription?: string | null;
  unitCost?: number | null;
  grossProfit?: number | null;
  weight?: number | null;
  dimensions?: string | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  brand?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  images?: Array<{
    id: string;
    url: string;
    alt?: string | null;
    sortOrder: number;
  }>;
  variants?: Array<{
    id: string;
    sku: string;
    color?: string | null;
    colorHex?: string | null;
    colorDisplayName?: string | null;
    size?: string | null;
    stockQuantity: number;
    priceAdjustment: number;
    imageUrl?: string | null;
  }>;
  collectionProducts?: Array<{
    collection: {
      id: string;
      name: string;
    };
  }>;
  printableArea?: {
    front: { width: number; height: number; x: number; y: number };
    back: { width: number; height: number; x: number; y: number };
    sleeve: { width: number; height: number; x: number; y: number };
    'left-sleeve'?: { width: number; height: number; x: number; y: number };
    'right-sleeve'?: { width: number; height: number; x: number; y: number };
  } | null;
  garmentType?: string | null;
  tags?: string[];
  colorImages?: Array<{
    id: string;
    productId: string | null;
    customInkProductId: string;
    customInkColorId: string;
    colorName: string;
    colorHex: string | null;
    imageUrls: string[]; // JSON array of strings
    isVerified: boolean;
    isActive: boolean;
  }>;
}

export interface AdminProductPayload {
  name: string;
  slug?: string;
  categoryId: string;
  brandId?: string | null;
  sku: string;
  basePrice: number;
  salePrice?: number;
  unitCost?: number;
  grossProfit?: number;
  stockQuantity?: number;
  description?: string;
  longDescription?: string;
  isActive?: boolean;
  isDraft?: boolean;
  isCustomizable?: boolean;
  weight?: number;
  dimensions?: string;
  variants?: Array<{
    sku: string;
    color?: string;
    colorHex?: string;
    colorDisplayName?: string;
    size?: string;
    stockQuantity: number;
    priceAdjustment?: number;
    imageUrl?: string;
  }>;
  images?: Array<{
    url: string;
    alt?: string;
    sortOrder?: number;
  }>;
  tags?: string[];
  collections?: string[];
  printableArea?: {
    front: { width: number; height: number; x: number; y: number };
    back: { width: number; height: number; x: number; y: number };
    sleeve: { width: number; height: number; x: number; y: number };
    'left-sleeve'?: { width: number; height: number; x: number; y: number };
    'right-sleeve'?: { width: number; height: number; x: number; y: number };
  } | null;
  garmentType?: string | null;
}

// Product Wizard Data Type
export interface ProductWizardData {
  // Step 1: Basic Info
  name?: string;
  categoryId?: string;
  description?: string;
  longDescription?: string;
  mainImage?: { url: string; alt?: string; file?: File };
  tags?: string[];

  // Step 2: Variants
  colors?: Array<{
    color: string;
    colorHex: string;
    displayName: string;
    images: Array<{ url: string; file?: File }>;
    enabled: boolean;
    mappingId?: string;
  }>;
  sizes?: Array<{
    size: string;
    displayName: string;
    sortOrder: number;
    enabled: boolean;
  }>;
  variantCombinations?: Array<{
    color: string;
    size: string;
    enabled: boolean;
    sku?: string;
    stockQuantity?: number;
    hasImage?: boolean;
  }>;

  // Step 3: Details
  sku?: string;
  basePrice?: number;
  salePrice?: number;
  unitCost?: number;
  grossProfit?: number;
  stockQuantity?: number;
  weight?: number;
  dimensions?: string;
  printableArea?: {
    front: { width: number; height: number; x: number; y: number };
    back: { width: number; height: number; x: number; y: number };
    sleeve: { width: number; height: number; x: number; y: number };
    'left-sleeve'?: { width: number; height: number; x: number; y: number };
    'right-sleeve'?: { width: number; height: number; x: number; y: number };
  };
  garmentType?: string;

  // Step 4: Publish
  publishOption?: 'publish' | 'draft' | 'scheduled';
  scheduledPublishAt?: Date;

  // Metadata
  productId?: string; // For draft recovery
  slug?: string;
}

// Admin Online Categories API
export const adminCategoriesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: 'active' | 'inactive' }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return api<{ data: AdminCategorySummary[]; pagination: PaginationResponse }>(
      `/admin/online-categories${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminCategoryDetail>(`/admin/online-categories/${id}`),
  create: (data: AdminCategoryPayload) =>
    api<AdminCategoryDetail>('/admin/online-categories', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AdminCategoryPayload>) =>
    api<AdminCategoryDetail>(`/admin/online-categories/${id}`, { method: 'PUT', body: data }),
  archive: (id: string) => api(`/admin/online-categories/${id}`, { method: 'DELETE' }),
};

// Offline Categories API (independent from online categories)
export const offlineCategoriesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: 'active' | 'inactive' }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return api<{ data: AdminCategorySummary[]; pagination: PaginationResponse }>(
      `/offline-orders/categories${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminCategoryDetail>(`/offline-orders/categories/${id}`),
  create: (data: AdminCategoryPayload) =>
    api<AdminCategoryDetail>('/offline-orders/categories', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AdminCategoryPayload>) =>
    api<AdminCategoryDetail>(`/offline-orders/categories/${id}`, { method: 'PUT', body: data }),
  archive: (id: string) => api(`/offline-orders/categories/${id}`, { method: 'DELETE' }),
};

// Admin Products API
// Inventory Alert API Types
export interface LowStockProduct {
  variantId: string;
  sku: string;
  productId: string;
  productName: string;
  productSku: string;
  currentStock: number;
  threshold: number;
  isOutOfStock: boolean;
  hasCustomThreshold?: boolean;
}

export interface InventoryAlerts {
  summary: {
    lowStockCount: number;
    outOfStockCount: number;
    totalAlerts: number;
    threshold: number;
  };
  lowStock: LowStockProduct[];
  outOfStock: LowStockProduct[];
}

export const inventoryApi = {
  // Get low stock products
  getLowStock: (threshold?: number) => {
    const query = new URLSearchParams();
    if (threshold !== undefined) query.append('threshold', threshold.toString());
    return api<{ products: LowStockProduct[]; count: number; threshold: number }>(
      `/admin/online-products/low-stock${query.toString() ? `?${query.toString()}` : ''}`
    );
  },
  // Get out of stock products
  getOutOfStock: () => api<{ products: LowStockProduct[]; count: number }>('/admin/online-products/out-of-stock'),
  // Get inventory alerts summary
  getAlerts: (threshold?: number) => {
    const query = new URLSearchParams();
    if (threshold !== undefined) query.append('threshold', threshold.toString());
    return api<InventoryAlerts>(`/admin/inventory/alerts${query.toString() ? `?${query.toString()}` : ''}`);
  },
  // Get low stock threshold for a variant
  getThreshold: (variantId: string) =>
    api<{
      variantId: string;
      sku: string;
      productName: string;
      lowStockThreshold: number | null;
      currentStock: number;
      effectiveThreshold: number;
    }>(`/admin/online-products/variants/${variantId}/low-stock-threshold`),
  // Update low stock threshold for a variant
  updateThreshold: (variantId: string, threshold: number | null) =>
    api<{
      id: string;
      sku: string;
      productName: string;
      lowStockThreshold: number | null;
      currentStock: number;
    }>(`/admin/online-products/variants/${variantId}/low-stock-threshold`, {
      method: 'PATCH',
      body: { threshold },
    }),
};

export const adminProductsApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive';
    categoryId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    const queryString = query.toString();
    return api<{ data: AdminProductSummary[]; pagination: any }>(
      `/admin/online-products${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminProductDetail>(`/admin/online-products/${id}`),
  create: (data: AdminProductPayload) =>
    api<AdminProductDetail>('/admin/online-products', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AdminProductPayload>) =>
    api<AdminProductDetail>(`/admin/online-products/${id}`, { method: 'PUT', body: data }),
  delete: (id: string) => api(`/admin/online-products/${id}`, { method: 'DELETE' }),
  updateStatus: (id: string, isActive: boolean) =>
    api<AdminProductDetail>(`/admin/online-products/${id}/status`, { method: 'PATCH', body: { isActive } }),
  uploadImages: async (productId: string, files: File[], altTexts?: string[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    if (altTexts && altTexts.length > 0) {
      formData.append('alt', altTexts.join(','));
    }

    return api<{ images: Array<{ id: string; url: string; alt?: string | null; sortOrder?: number }> }>(
      `/admin/online-products/${productId}/images`,
      {
        method: 'POST',
        body: formData,
        headers: {},
      }
    );
  },
  deleteImage: (productId: string, imageId: string) =>
    api(`/admin/online-products/${productId}/images/${imageId}`, { method: 'DELETE' }),
  activate: (id: string) => api(`/admin/online-products/${id}/activate`, { method: 'PATCH' }),
  deactivate: (id: string) => api(`/admin/online-products/${id}/deactivate`, { method: 'PATCH' }),
  bulkUpdateStatus: (ids: string[], status: string) => api('/admin/online-products/batch/status', { method: 'PATCH', body: { ids, status } }),
  bulkDelete: (ids: string[]) => api('/admin/online-products/batch', { method: 'DELETE', body: { ids } }),
};

export interface AdminUserSummary {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  role: string;
  emailVerified: boolean;
  orderCount: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminUserDetailResponse {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName: string;
    phone?: string | null;
    role: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    totalOrders: number;
    totalSpent: number;
    designsCreated: number;
    memberSince: string;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: string;
  }>;
}

export interface AdminCreateUserPayload {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  role?: 'CUSTOMER' | 'ADMIN' | 'customer' | 'admin';
  emailVerified?: boolean;
}

export interface AdminCreateUserResponse {
  user: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
    fullName: string;
    phone?: string | null;
    role: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
  };
}

export const adminUsersApi = {
  list: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: 'customer' | 'admin';
    status?: 'active' | 'inactive';
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return api<{ data: AdminUserSummary[]; pagination: any }>(
      `/admin/users${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminUserDetailResponse>(`/admin/users/${id}`),
  create: (data: AdminCreateUserPayload) => // 创建新用户
    api<AdminCreateUserResponse>('/admin/users', { method: 'POST', body: data }),
  updateRole: (id: string, role: string) =>
    api<{ message: string; user: AdminUserSummary }>(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: { role },
    }),
  delete: (id: string) => api(`/admin/users/${id}`, { method: 'DELETE' }),
  resetPassword: (id: string, password: string) =>
    api<{ message: string }>(`/admin/users/${id}/reset-password`, {
      method: 'POST',
      body: { password },
    }),
};

export interface AdminDesignSummary {
  id: string;
  name: string;
  status: string;
  reviewStatus: 'Pending' | 'Approved' | 'Rejected' | string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl?: string | null;
  user?: {
    id: string;
    email: string;
    firstName?: string | null;
    lastName?: string | null;
  } | null;
  productVariant?: {
    id: string;
    sku?: string | null;
    color?: string | null;
    size?: string | null;
    product?: {
      id: string;
      name: string;
    } | null;
  } | null;
}

export interface AdminDesignDetail extends AdminDesignSummary {
  canvasSnapshot: DesignCanvasSnapshot; // Issue #105 - Replace any with proper type
  pricingSnapshot?: PricingSnapshot; // Issue #105 - Replace any with proper type
  assets: Array<{
    id: string;
    fileName: string;
    url: string;
    contentType: string;
    uploadedAt: string;
  }>;
  versions: Array<{
    id: string;
    version: number;
    summary?: string | null;
    createdAt: string;
  }>;
}

export const adminDesignsApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: 'pending' | 'approved' | 'rejected' }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return api<{ data: AdminDesignSummary[]; pagination: any }>(
      `/admin/designs${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<{ data: AdminDesignDetail }>(`/admin/designs/${id}`),
  updateStatus: (id: string, payload: { status: 'approve' | 'reject' | 'pending' | 'lock'; note?: string }) =>
    api<{ data: AdminDesignSummary }>(`/admin/designs/${id}/status`, { method: 'PATCH', body: payload }),
};

export interface AdminCoupon {
  id: string;
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  usageLimit?: number | null;
  userUsageLimit?: number | null;
  usedCount: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export const adminCouponsApi = {
  list: (params?: { search?: string; status?: 'all' | 'active' | 'inactive' }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    const queryString = query.toString();
    return api<{ data: AdminCoupon[] }>(`/admin/coupons${queryString ? `?${queryString}` : ''}`);
  },
  // Get coupon statistics for Issue #138
  getStatistics: (params?: { couponId?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.couponId) query.append('couponId', params.couponId);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    return api<{
      data: {
        overview: {
          totalCoupons: number;
          activeCoupons: number;
          inactiveCoupons: number;
          totalUsage: number;
          totalDiscountAmount: number;
        };
        topCoupons: Array<{
          coupon: {
            id: string;
            code: string;
            type: 'percentage' | 'fixed';
            value: number;
            isActive: boolean;
          } | null;
          usageCount: number;
          totalDiscount: number;
        }>;
        usageByDate: Array<{
          date: string;
          usageCount: number;
          totalDiscount: number;
        }>;
      };
    }>(`/admin/coupons/statistics${queryString ? `?${queryString}` : ''}`);
  },
  // Get coupon detail statistics
  getCouponStatistics: (id: string, params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    return api<{
      data: {
        coupon: AdminCoupon;
        statistics: {
          usageCount: number;
          totalDiscount: number;
          averageDiscount: number;
          uniqueUsers: number;
          usageByDate: Array<{
            date: string;
            usageCount: number;
            totalDiscount: number;
          }>;
        };
        recentUsage: Array<{
          orderNumber: string;
          discountAmount: number;
          orderTotal: number;
          usedAt: string;
        }>;
      };
    }>(`/admin/coupons/${id}/statistics${queryString ? `?${queryString}` : ''}`);
  },
  create: (data: {
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrderValue?: number;
    maxDiscount?: number;
    usageLimit?: number;
    userUsageLimit?: number;
    startDate: string;
    endDate: string;
    isActive?: boolean;
  }) => api<{ data: AdminCoupon }>('/admin/coupons', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Omit<AdminCoupon, 'id' | 'createdAt' | 'updatedAt' | 'usedCount' | 'isActive'>>) =>
    api<{ data: AdminCoupon }>(`/admin/coupons/${id}`, { method: 'PUT', body: data }),
  toggle: (id: string, isActive: boolean) =>
    api<{ data: AdminCoupon }>(`/admin/coupons/${id}/status`, { method: 'PATCH', body: { isActive } }),
  remove: (id: string) => api(`/admin/coupons/${id}`, { method: 'DELETE' }),
};

export interface AdminPromotion {
  id: string;
  title: string;
  description?: string | null;
  bannerImageUrl?: string | null;
  linkUrl?: string | null;
  // 折扣相关字段
  // Support buy-get-free type for Issue #139
  discountType: 'percentage' | 'fixed' | 'buy_get_free';
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  // Buy-get-free promotion fields for Issue #139
  buyQuantity?: number | null;
  getQuantity?: number | null;
  giftProduct?: { id: string; name: string } | null;
  giftVariant?: { id: string; sku: string } | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  // 关联数据
  products?: Array<{ id: string; name: string; slug: string }>;
  categories?: Array<{ id: string; name: string; slug: string }>;
  coupon?: { id: string; code: string; type: string } | null;
}

// 公共促销活动接口
export interface Promotion {
  id: string;
  title: string;
  description?: string;
  bannerImageUrl?: string;
  linkUrl?: string;
  // Support buy-get-free type for Issue #139
  discountType: 'percentage' | 'fixed' | 'buy_get_free';
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  // Buy-get-free promotion fields for Issue #139
  buyQuantity?: number | null;
  getQuantity?: number | null;
  giftProduct?: { id: string; name: string } | null;
  giftVariant?: { id: string; sku: string } | null;
  startDate: string;
  endDate: string;
  isActive: boolean;
  sortOrder: number;
}

export const adminPromotionsApi = {
  list: (params?: { search?: string; status?: 'all' | 'active' | 'inactive' }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    const queryString = query.toString();
    return api<{ data: AdminPromotion[] }>(`/admin/promotions${queryString ? `?${queryString}` : ''}`);
  },
  create: (data: Omit<AdminPromotion, 'id' | 'createdAt' | 'updatedAt' | 'products' | 'categories' | 'coupon'>) =>
    api<{ data: AdminPromotion }>('/admin/promotions', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Omit<AdminPromotion, 'id' | 'createdAt' | 'updatedAt' | 'products' | 'categories' | 'coupon'>>) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => api(`/admin/promotions/${id}`, { method: 'DELETE' }),
  // 商品关联管理
  addProducts: (id: string, productIds: string[]) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/products`, { method: 'POST', body: { productIds } }),
  removeProduct: (id: string, productId: string) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/products/${productId}`, { method: 'DELETE' }),
  // 类目关联管理
  addCategories: (id: string, categoryIds: string[]) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/categories`, { method: 'POST', body: { categoryIds } }),
  removeCategory: (id: string, categoryId: string) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/categories/${categoryId}`, { method: 'DELETE' }),
  // 优惠券关联管理
  setCoupon: (id: string, couponId: string | null) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/coupon`, { method: 'PUT', body: { couponId } }),
};

// 公共促销活动 API
export const promotionApi = {
  getActive: () => api<{ promotions: Promotion[] }>('/promotions'),
  getForProduct: (productId: string) => api<{ promotions: Promotion[] }>(`/promotions/product/${productId}`),
  getForCategory: (categoryId: string) => api<{ promotions: Promotion[] }>(`/promotions/category/${categoryId}`),
  getForProducts: (productIds: string[]) =>
    api<Record<string, Promotion[]>>(`/promotions/products?ids=${productIds.join(',')}`),
  calculate: (data: { items: Array<{ productId: string; quantity: number; unitPrice: number }>; subtotal: number }) =>
    api<{ discount: number; promotions: Array<{ promotionId: string; promotionTitle: string; productId: string; discountAmount: number }> }>(
      '/promotions/calculate',
      { method: 'POST', body: data }
    ),
};

export interface SiteSettingsPayload {
  siteName: string;
  contactEmail: string;
  contactPhone: string;
  currency: string;
  shippingProvider: string;
  paymentGateway: string;
  testMode: boolean;
  autoApproveDesigns: boolean;
  copyrightCheck: boolean;
  reviewEmail: string;
}

// 导航菜单项类型 (保留用于 SiteHeader 向后兼容)
export interface NavigationMenuItem {
  id: string;
  label: string;
  href: string;
  order: number;
  type: 'link' | 'mega' | 'simple';
  // mega menu 配置
  megaPanel?: {
    columns: Array<{
      id: string;
      links: Array<{
        id: string;
        label: string;
        href: string;
      }>;
    }>;
  };
  // simple panel 配置（如 Design Lab）
  simplePanel?: {
    title: string;
    description: string;
    actions: Array<{
      label: string;
      href: string;
      variant?: 'primary' | 'outline';
    }>;
  };
}

// 首页内容类型
export interface HomePageContent {
  heroTitle: string;
  heroSubtitle: string;
  heroCards: Array<{
    id: string;
    src: string;
    alt: string;
  }>;
  servicePromises: Array<{
    id: string;
    title: string;
    detail: string;
  }>;
  testimonials: Array<{
    id: string;
    quote: string;
    author: string;
    stars: number;
  }>;
  enterprisePanels: Array<{
    id: string;
    title: string;
    description: string;
    ctaLabel: string;
    ctaHref: string;
    ctaVariant?: 'primary' | 'outline';
  }>;
  brandLogos: Array<{
    id: string;
    name: string;
    src: string;
  }>;
}

// 关于页内容类型
export interface AboutPageContent {
  headerTitle: string;
  headerDescription: string;
  milestones: Array<{
    id: string;
    year: string;
    detail: string;
  }>;
  values: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  teamTitle: string;
  teamDescription: string;
}

// 帮助页内容类型
export interface HelpPageContent {
  quickLinks: Array<{
    id: string;
    label: string;
    href: string;
    icon: string;
  }>;
  faqCategories: Array<{
    id: string;
    category: string;
    icon: string;
    items: Array<{
      id: string;
      question: string;
      answer: string;
    }>;
  }>;
}

// 通用静态文字类型
export interface StaticTexts {
  topMessageBar: string;
}

// Footer 配置类型
export interface FooterConfig {
  socialLinks: Array<{
    id: string;
    platform: string;
    url: string;
    icon: string;
  }>;
  contactInfo: {
    phone: string;
    email: string;
    hours: {
      weekday: string;
      saturday: string;
      sunday: string;
    };
    holidayNotice: string;
  };
  columns: Array<{
    id: string;
    title: string;
    links: Array<{
      id: string;
      label: string;
      href: string;
    }>;
  }>;
  copyrightText: string;
  bottomLinks: Array<{
    id: string;
    label: string;
    href: string;
  }>;
}

export interface ContentConfig {
  // 保留原有字段以向后兼容
  heroCards: Array<{
    id: string;
    title: string;
    subtitle: string;
    imageUrl: string;
    linkUrl: string;
  }>;
  brandLogos: Array<{
    id: string;
    name: string;
    imageUrl: string;
  }>;
  featuredCollections: Array<{
    id: string;
    title: string;
    linkUrl: string;
  }>;
  // 新增 CMS 字段
  navigation?: NavigationMenuItem[];
  homePage?: HomePageContent;
  aboutPage?: AboutPageContent;
  helpPage?: HelpPageContent;
  staticTexts?: StaticTexts;
  footer?: FooterConfig;
}

export interface ColorMappingPayload {
  id: string;
  productColor: string;
  values: string[];
  images: string[];
}

export const adminSettingsApi = {
  getSite: () => api<{ data: SiteSettingsPayload }>('/admin/settings/site'),
  updateSite: (data: SiteSettingsPayload) =>
    api<{ data: SiteSettingsPayload }>('/admin/settings/site', { method: 'PUT', body: data }),
  getColorMappings: () => api<{ data: ColorMappingPayload[] }>('/admin/settings/color-mappings'),
  updateColorMappings: (mappings: ColorMappingPayload[]) => api('/admin/settings/color-mappings', { method: 'PUT', body: { mappings } }),
  deleteColorMapping: (id: string) => api(`/admin/settings/color-mappings/${id}`, { method: 'DELETE' }),
  getPrintPricing: () => api<{ data: PrintPricingConfig }>('/admin/settings/print-pricing'),
  updatePrintPricing: (data: PrintPricingConfig) =>
    api<{ data: PrintPricingConfig }>('/admin/settings/print-pricing', { method: 'PUT', body: data }),
  getQuantityTiers: () => api<{ data: QuantityTier[] }>('/admin/settings/quantity-tiers'),
  updateQuantityTiers: (tiers: QuantityTier[]) =>
    api<{ data: QuantityTier[] }>('/admin/settings/quantity-tiers', { method: 'PUT', body: { tiers } }),
};

export interface PrintSizeTier {
  price: number;
  label: string;
  desc: string;
}
export interface PrintPricingConfig {
  dtf: { small: PrintSizeTier; medium: PrintSizeTier; large: PrintSizeTier };
  embroidery: { small: PrintSizeTier; medium: PrintSizeTier; large: PrintSizeTier };
}
export interface QuantityTier {
  minQty: number;
  discount: number;
  label: string;
}


export const adminContentApi = {
  get: () => api<{ data: ContentConfig }>('/admin/settings/content'),
  update: (data: ContentConfig) =>
    api<{ data: ContentConfig }>('/admin/settings/content', { method: 'PUT', body: data }),
  // 图片上传 API
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    return api<{ data: { url: string } }>('/admin/content/upload', {
      method: 'POST',
      body: formData,
      headers: {}, // 让浏览器自动设置 Content-Type 和 boundary
    });
  },
};

// 公共内容 API（不需要认证，供前端展示使用）
export const contentApi = {
  get: () => api<{ data: ContentConfig }>('/content'),
};

// Production templates types & APIs
export interface ProductionStage {
  key: string;
  label: string;
}
export interface ProductionTemplate {
  id: string;
  name: string;
  stages: ProductionStage[];
}

export const adminProductionTemplatesApi = {
  get: () => api<{ data: ProductionTemplate[] }>('/admin/settings/production/templates'),
  update: (templates: ProductionTemplate[]) =>
    api<{ data: ProductionTemplate[] }>('/admin/settings/production/templates', { method: 'PUT', body: templates }),
};

export interface AdminCostSummary {
  totalCost: number;
  totalRevenue: number;
  averageGrossProfit: number;
  averageMargin: number;
}

export interface AdminCostRow {
  id: string;
  name: string;
  sku?: string | null;
  category?: {
    id: string;
    name: string;
  } | null;
  unitCost: number;
  salePrice: number;
  grossProfit: number;
  margin: number;
  updatedAt: string;
}

export const adminCostManagementApi = {
  getSummary: () => api<{ data: AdminCostSummary }>('/admin/cost-management/summary'),
  listProducts: (params?: { search?: string; categoryId?: string; sort?: string; order?: 'asc' | 'desc' }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.categoryId) query.append('categoryId', params.categoryId);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.order) query.append('order', params.order);
    const queryString = query.toString();
    return api<{ data: AdminCostRow[] }>(`/admin/cost-management/products${queryString ? `?${queryString}` : ''}`);
  },
  updateProduct: (id: string, data: { unitCost: number; salePrice: number; grossProfit?: number }) =>
    api<{ data: AdminCostRow }>(`/admin/cost-management/products/${id}`, { method: 'PUT', body: data }),
  listCategories: () => api<{ data: Array<{ id: string; name: string; productCount: number }> }>(
    '/admin/cost-management/categories'
  ),
};

// Design Lab API Types
// Issue #105 - Define proper types for canvas objects
export interface CanvasObject {
  type: string;
  [key: string]: unknown; // Fabric.js objects have dynamic properties
}

export interface DesignCanvasSnapshot {
  size: { width: number; height: number };
  objects: CanvasObject[]; // Issue #105 - Replace any[] with proper type
}

// Issue #105 - Define pricing snapshot type
export interface PricingSnapshot {
  basePrice?: number;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  [key: string]: unknown; // Allow additional pricing fields
}

export interface DesignDraft {
  id: string;
  name: string;
  productVariantId: string;
  userId?: string | null;
  sessionId?: string | null;
  status: string;
  currentVersion: number;
  canvasSnapshot: DesignCanvasSnapshot;
  pricingSnapshot?: PricingSnapshot | null; // Issue #105 - Replace any with proper type
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignDraftPayload {
  productVariantId: string;
  name?: string;
  canvas?: DesignCanvasSnapshot;
  pricing?: PricingSnapshot; // Issue #105 - Replace any with proper type
  thumbnailUrl?: string;
}

export interface UpdateDesignDraftPayload {
  name?: string;
  canvas?: DesignCanvasSnapshot;
  pricing?: PricingSnapshot; // Issue #105 - Replace any with proper type
  thumbnailUrl?: string;
  summary?: string;
}

// Product Color Image API
// [2026-03-03 14:20:00] getAll 在表为空时后端会回退到 settings.site.colorMappings，Design Lab 与 admin 颜色一致
export const productColorImageApi = {
  getColorMapping: (productId: string) =>
    api<{ data: { productId: string; mapping: Record<string, string>; colors: Array<{ colorId: string; colorName: string; colorHex: string | null; imageUrls: { front: string; back: string; sleeve: string } }> } }>(`/product-color-images/mapping/${productId}`),
  getImageUrlByColor: (productId: string, colorName: string, view: 'front' | 'back' | 'sleeve' = 'front') =>
    api<{ data: { colorId: string; colorName: string; colorHex: string | null; imageUrl: string; view: string; allViews: { front: string; back: string; sleeve: string } } }>(`/product-color-images/by-color/${productId}/${encodeURIComponent(colorName)}?view=${view}`),
  getAll: (productId?: string) =>
    api<{ data: Array<{ id: string; productId?: string; colorName?: string; name?: string; hex?: string; externalColorId?: string; imageUrls?: Record<string, string>; imageUrl?: string;[key: string]: unknown }>; count: number }>(`/product-color-images${productId ? `?productId=${productId}` : ''}`), // Issue #105 - Replace any[] with proper type
  /** 仅从 settings.site.colorMappings 读取，供 admin 多视角图等使用 */
  getPreviewFromSettings: () =>
    api<{ success: boolean; data: Array<{ id: string; name: string; hex: string; externalColorId?: string; imageUrls?: Record<string, string> }>; count: number; source: string }>('/product-color-images/preview-from-settings'),
};

// Design Lab API - Public size fees API
export const sizeFeesApi = {
  getAll: async () => {
    console.log('[sizeFeesApi] 📡 Calling getAll() - endpoint: /size-fees');
    try {
      const result = await api<{
        success: boolean;
        data: Array<{
          id: string;
          size: string;
          sizeType?: 'Youth' | 'Adult' | 'Other';
          additionalFee: number;
          displayOrder?: number;
        }>;
        count: number;
      }>('/size-fees');

      console.log('[sizeFeesApi] ✅ API call successful:', {
        success: result?.success,
        hasData: !!result?.data,
        dataLength: result?.data?.length || 0,
        count: result?.count,
        firstFewItems: result?.data?.slice(0, 3) || []
      });

      return result;
    } catch (error: any) {
      console.error('[sizeFeesApi] ❌ API call failed:', {
        error,
        message: error?.message,
        status: error?.status,
        response: error?.response
      });
      throw error;
    }
  },
};

export const designLabApi = {
  createDraft: (payload: CreateDesignDraftPayload) =>
    api<{ data: DesignDraft; meta?: { sessionId?: string } }>('/designs', {
      method: 'POST',
      body: payload,
    }),
  getDraft: (id: string) => api<{ data: DesignDraft }>(`/designs/${id}`),
  updateDraft: (id: string, payload: UpdateDesignDraftPayload) =>
    api<{ data: DesignDraft }>(`/designs/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  deleteDraft: (id: string) => api(`/designs/${id}`, { method: 'DELETE' }),
  generateAssetUpload: async (designId: string, payload: { fileName: string; fileSize: number; contentType: string }) => {
    const response = await fetch(`${API_BASE_URL}/designs/${designId}/upload-signature`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `API Error: ${response.status}`);
    }
    return response.json();
  },
  requestQuote: (designId: string, payload?: any) =>
    api(`/designs/${designId}/quote`, { method: 'POST', body: payload || {} }),
  submitOrder: (designId: string, payload?: any) =>
    api(`/designs/${designId}/order`, { method: 'POST', body: payload || {} }),
  // 获取设计详情（包含分享信息）
  getDesign: (id: string) => api<{ success: boolean; data: DesignDraft & { shareToken?: string; shareUrl?: string } }>(`/designs/${id}`),
  // 分享设计（生成分享链接）
  shareDesign: (id: string) => api<{ success: boolean; data: { shareToken: string; shareUrl: string } }>(`/designs/${id}/share`, { method: 'POST' }),
};

// Admin Orders API Types
export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  designReviewStatus?: string | null;
  mockupUrl?: string | null;
  total: number;
  currency: string;
  customerEmail?: string | null;
  customerName?: string | null;
  itemCount?: number;
  items?: any[];
  subtotal?: number;
  shippingCost?: number;
  tax?: number;
  discount?: number;
  shippingAddress?: any;
  billingAddress?: any;
  shipments?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface AdminOrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  sort?: string;
}

export interface AdminOrderRefundPayload {
  reason?: string;
  amount?: number; // Support partial refund
  refundToStripe?: boolean; // Whether to process refund via Stripe
}

export interface AdminOrderUpdatePayload {
  status?: string;
  paymentStatus?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
}

// Unified Order Types (Online + Offline)
export interface UnifiedOrderDTO {
  id: string;
  compositeId: string; // 'online-<id>' or 'offline-<id>'
  type: 'online' | 'offline';
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'completed' | 'refunded';
  orderNo: string;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string;
  totalAmount: number;
  currency: string;
  itemsCount: number;
  createdAt: string;
  updatedAt?: string;
  channelInfo?: {
    channel: 'web' | 'pos' | 'manual' | 'other';
    source?: string;
  };
  shippingAddressSummary?: string | null;
  notes?: string | null;
  paymentStatus?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  stageKey?: string;
  stageLabel?: string;
  projectName?: string;
}

export interface UnifiedOrderListParams {
  page?: number;
  pageSize?: number;
  type?: 'all' | 'online' | 'offline';
  status?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  email?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Audit Logs 功能已移除

// Admin Orders API
export const adminOrdersApi = {
  list: (params?: AdminOrderListParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.status) query.append('status', params.status);
    if (params?.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    const queryString = query.toString();
    return api<{ data: AdminOrderSummary[]; pagination: any }>(
      `/admin/orders${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<any>(`/admin/orders/${id}`),
  updateStatus: (id: string, payload: any) =>
    api(`/admin/orders/${id}/status`, { method: 'PATCH', body: payload }),
  // Batch operations for Issue #87
  batchUpdateStatus: (orderIds: string[], payload: { status?: string; paymentStatus?: string }) =>
    api<{ success: boolean; updatedCount: number; orderIds: string[] }>(`/admin/orders/batch/status`, {
      method: 'PATCH',
      body: { orderIds, ...payload },
    }),
  exportOrders: async (params?: {
    orderIds?: string[];
    status?: string;
    paymentStatus?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.orderIds) {
      if (Array.isArray(params.orderIds)) {
        params.orderIds.forEach((id) => query.append('orderIds', id));
      } else {
        query.append('orderIds', params.orderIds);
      }
    }
    if (params?.status) query.append('status', params.status);
    if (params?.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params?.search) query.append('search', params.search);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    const response = await fetch(`${API_BASE_URL}/admin/orders/export${queryString ? `?${queryString}` : ''}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Export failed: ${response.status}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  recordRefund: (id: string, payload: AdminOrderRefundPayload) =>
    api(`/admin/orders/${id}/refund`, { method: 'POST', body: payload }),
  // EasyShip shipping label APIs
  getShippingRates: (id: string) => api<{ orderId: string; orderNumber: string; rates: Array<{ id: string; courier: string; service: string; price: number; currency: string; estimatedDeliveryDays?: number | null }>; currency: string }>(`/admin/orders/${id}/shipment/rates`),
  generateShippingLabel: (id: string, rateId?: string) =>
    api<{
      id: string;
      orderId: string;
      orderNumber: string;
      trackingNumber: string | null;
      carrier: string | null;
      labelUrl: string | null;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>(`/admin/orders/${id}/shipment/label`, { method: 'POST', body: rateId ? { rateId } : {} }),
  // auditTrail 功能已移除

  // Design Review flow
  listDesignReviewQueue: () =>
    api<{ orders: any[] }>('/admin/orders/design-review/queue'),
  syncDesign: (id: string, mockupUrl: string) =>
    api<{ order: any; gangSheetPending: boolean }>(`/admin/orders/${id}/design-review/sync`, {
      method: 'PATCH',
      body: { mockupUrl },
    }),
  rejectDesign: (id: string, note: string) =>
    api<{ order: any }>(`/admin/orders/${id}/design-review/reject`, {
      method: 'PATCH',
      body: { note },
    }),

  // Logistics export + CSV import
  exportLogistics: async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const response = await fetch(`${API_BASE_URL}/admin/orders/logistics/export`, {
      credentials: 'include',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error(`Export failed: ${response.status}`);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logistics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
  importLogistics: (rows: { orderNumber: string; carrier?: string; trackingNumber: string }[]) =>
    api<{ updated: string[]; notFound: string[]; errors: any[] }>('/admin/orders/logistics/import-csv', {
      method: 'POST',
      body: { rows },
    }),

  // Gang Sheet
  getGangSheet: (id: string) => api<{ gangSheet: any }>(`/admin/orders/${id}/gang-sheet`),
};

// Admin Offline Orders API Types
// Offline order stage metadata aligned with backend payload
export interface OfflineOrderStageMeta {
  key: string;
  label: string;
  labelEn?: string;
  labelZh?: string;
  description?: string;
  position?: number;
}

// Offline order contact shape used across admin views
export interface OfflineOrderContact {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
}

// Offline order asset metadata for intake uploads
export interface OfflineOrderAsset {
  id: string;
  fileName: string;
  fileSize: number;
  contentType?: string | null;
  url: string;
  uploadedAt?: string;
  uploadedBy?: string | null;
}

// Offline order history entry for stage tracking
export interface OfflineOrderHistoryEntry {
  id: string;
  fromStageKey?: string | null;
  toStageKey: string;
  actorId?: string | null;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
}

// Production work order event timeline definition
export interface ProductionWorkOrderEvent {
  id: string;
  status: string;
  actorId?: string | null;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
}

// Production work order detail returned by backend
export interface ProductionWorkOrderDetail {
  id: string;
  workOrderCode: string;
  status: string;
  priority?: number | null;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  assignee?: {
    id?: string | null;
    name?: string | null;
  } | null;
  notes?: string | null;
  metadata?: any;
  events: ProductionWorkOrderEvent[];
}

// Admin offline order summary aligned with mapOrder response
export interface AdminOfflineOrderSummary {
  id: string;
  orderCode: string;
  projectName: string;
  primaryProduct?: string | null;
  quantity?: number | null;
  deliveryDate?: string | null;
  description?: string | null;
  requiresMockups: boolean;
  requiresProof: boolean;
  rushOrder: boolean;
  stage: OfflineOrderStageMeta;
  status: string;
  contact: OfflineOrderContact;
  configuration?: any;
  metadata?: any;
  assets: OfflineOrderAsset[];
  productionWorkOrder?: ProductionWorkOrderDetail | null;
  payment?: {
    method?: string | null;
    referenceNumber?: string | null;
    depositAmount?: number;
    dstFileFee?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OfflineOrderAuditLogEntry {
  id: string;
  action: string;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  actorId?: string | null;
  actorName?: string | null;
  metadata?: any;
  createdAt: string;
}

// Admin offline order detail extends summary with histories
export interface AdminOfflineOrderDetail extends AdminOfflineOrderSummary {
  histories: OfflineOrderHistoryEntry[];
  auditLogs: OfflineOrderAuditLogEntry[];
}

// Offline order list response with pagination and stage config
export interface AdminOfflineOrderListResponse {
  orders: AdminOfflineOrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stages: OfflineOrderStageMeta[];
}

// Metrics payload for sales/business dashboard — 2026-03-14 redesign
export interface OfflineOrderMetricsResponse {
  sales: {
    orderCount: number;
    revenueTotal: number;
    averageOrderValue: number;
    inventoryConsumed?: number;
    averageUnitPrice?: number;
  };
  cost: { costTotal: number; marginTotal: number; marginPercent: number };
  previousPeriod?: {
    orderCount: number;
    revenueTotal: number;
    costTotal: number;
    marginTotal: number;
    marginPercent: number;
    averageOrderValue: number;
  } | null;
  plStatement?: { salePrice: number; totalCosts: number; netProfit: number };
  bestSellers?: Array<{ productName: string; quantity: number }>;
  byCategory?: Array<{ category: string; quantity: number }>;
  byPaymentMode?: Array<{ paymentMode: string; orderCount: number; revenue: number }>;
  byCreator?: Array<{ creatorId: string; creatorName?: string; orderCount: number; revenue: number; cost: number; margin: number; marginPercent: number }>;
  byProductLine?: Array<{ productName: string; category?: string; orderCount: number; revenue: number; cost: number; margin: number; marginPercent: number }>;
  timeSeries: Array<{ date: string; orderCount: number; revenue: number }>;
  timeSeriesPrev?: Array<{ date: string; orderCount: number; revenue: number }>;
}

export type OfflineOrderStage = OfflineOrderStageMeta;

export interface ProductionWorkOrderPayload {
  status?: string;
  priority?: number;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  assigneeId?: string;
  assigneeName?: string;
  notes?: string;
  metadata?: any;
  eventNote?: string;
}

// Admin Offline Orders API aligned with backend routes
export const adminOfflineOrdersApi = {
  create: (payload: FormData) =>
    api<{ success: boolean; order: AdminOfflineOrderDetail }>('/offline-orders', {
      method: 'POST',
      body: payload,
    }),
  update: (id: string, payload: FormData) =>
    api<{ success: boolean; order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  list: (params?: { stageKey?: string; search?: string; rush?: boolean; status?: string; paymentMethod?: string; paymentStatus?: string; date?: string }) => {
    const query = new URLSearchParams();
    if (params?.stageKey) query.append('stageKey', params.stageKey);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.rush !== undefined) query.append('rush', params.rush ? 'true' : 'false');
    if (params?.paymentMethod) query.append('paymentMethod', params.paymentMethod);
    if (params?.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params?.date) query.append('date', params.date);
    const queryString = query.toString();
    return api<AdminOfflineOrderListResponse>(
      `/admin/offline-orders${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<{ order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}`),
  getMetrics: (params?: {
    scope?: 'all' | 'mine';
    startDate?: string;
    endDate?: string;
    primaryProduct?: string;
    creatorId?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.scope) query.append('scope', params.scope);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.primaryProduct) query.append('primaryProduct', params.primaryProduct);
    if (params?.creatorId) query.append('creatorId', params.creatorId);
    const qs = query.toString();
    return api<OfflineOrderMetricsResponse>(`/admin/offline-orders/metrics/summary${qs ? `?${qs}` : ''}`);
  },
  updateStage: (id: string, payload: { stageKey: string; note?: string }) =>
    api(`/admin/offline-orders/${id}/stage`, { method: 'PATCH', body: payload }),
  addNote: (id: string, note: string) =>
    api(`/admin/offline-orders/${id}/notes`, { method: 'POST', body: { note } }),
  uploadAssets: async (id: string, files: File[], comments?: string[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('assets', file));
    if (comments && comments.length > 0) {
      formData.append('comments', JSON.stringify(comments));
    }
    const response = await fetch(`${API_BASE_URL}/admin/offline-orders/${id}/assets`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `API Error: ${response.status}`);
    }
    return response.json();
  },
  upsertProductionWorkOrder: (id: string, payload: ProductionWorkOrderPayload) =>
    api(`/admin/offline-orders/${id}/production`, {
      method: 'POST',
      body: payload,
    }),
  // Fix: Add missing delete method for offline orders
  delete: (id: string) =>
    api(`/admin/offline-orders/${id}`, {
      method: 'DELETE',
    }),
  // Global offline workflow stage configuration
  getWorkflowStages: () =>
    api<{ success: boolean; stages: OfflineOrderStage[] }>('/admin/offline-orders/config/stages'),
  updateWorkflowStages: (stages: OfflineOrderStage[]) =>
    api<{ success: boolean; stages: OfflineOrderStage[] }>('/admin/offline-orders/config/stages', {
      method: 'PUT',
      body: { stages },
    }),
  // Size fee management
  getSizeFees: () =>
    api<{ success: boolean; data: OfflineOrderSizeFee[]; count: number }>('/admin/offline-order-size-fees'),
  createSizeFee: (sizeFee: Omit<OfflineOrderSizeFee, 'id'>) =>
    api<{ success: boolean; data: OfflineOrderSizeFee }>('/admin/offline-order-size-fees', {
      method: 'POST',
      body: sizeFee,
    }),
  updateSizeFee: (id: string, sizeFee: Partial<OfflineOrderSizeFee>) =>
    api<{ success: boolean; data: OfflineOrderSizeFee }>(`/admin/offline-order-size-fees/${id}`, {
      method: 'PATCH',
      body: sizeFee,
    }),
  deleteSizeFee: (id: string) =>
    api<{ success: boolean; message: string }>(`/admin/offline-order-size-fees/${id}`, {
      method: 'DELETE',
    }),
};

// Supplier API for Issue #89
export interface Supplier {
  id: string;
  name: string;
  apiUrl: string;
  apiKey: string;
  apiSecret?: string | null;
  syncInterval: number;
  isActive: boolean;
  lastSyncAt?: string | null;
  lastSyncStatus?: string | null;
  config?: any;
  createdAt: string;
  updatedAt: string;
}

export interface InventorySync {
  id: string;
  supplierId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED' | 'PARTIAL';
  startedAt: string;
  completedAt?: string | null;
  itemsProcessed: number;
  itemsUpdated: number;
  itemsFailed: number;
  errorMessage?: string | null;
  metadata?: any;
  createdAt: string;
}

export const suppliersApi = {
  list: () => api<{ suppliers: Supplier[] }>('/admin/suppliers'),
  get: (id: string) => api<{ supplier: Supplier }>(`/admin/suppliers/${id}`),
  create: (data: Partial<Supplier>) => api<{ supplier: Supplier }>('/admin/suppliers', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Supplier>) => api<{ supplier: Supplier }>(`/admin/suppliers/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/admin/suppliers/${id}`, { method: 'DELETE' }),
  sync: (id: string, options?: { force?: boolean; dryRun?: boolean }) =>
    api<{
      success: boolean;
      syncId: string;
      status: string;
      itemsProcessed: number;
      itemsUpdated: number;
      itemsFailed: number;
      errors?: any[];
      dryRun?: boolean;
    }>(`/admin/suppliers/${id}/sync`, { method: 'POST', body: options || {} }),
  getSyncHistory: (id: string, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const queryString = query.toString();
    return api<{ syncs: InventorySync[]; total: number; limit: number; offset: number }>(
      `/admin/suppliers/${id}/sync-history${queryString ? `?${queryString}` : ''}`
    );
  },
  getSyncStatus: () => api<{ suppliers: Array<Supplier & { latestSync?: InventorySync | null }> }>('/admin/suppliers/sync-status'),
};

// Contact form API
export const contactApi = {
  submit: (data: {
    name: string;
    email: string;
    phone?: string;
    subject?: string;
    message: string;
    orderNumber?: string;
  }) =>
    api('/contact', {
      method: 'POST',
      body: data,
    }),
};

// Coupon API
export const couponApi = {
  validate: (code: string, subtotal: number, userId?: string) =>
    api('/coupons/validate', {
      method: 'POST',
      body: { code, subtotal, userId },
    }),
  getActive: () => api<{
    coupons: Array<{
      id: string;
      code: string;
      type: 'percentage' | 'fixed';
      value: number;
      minOrderValue: number | null;
      maxDiscount: number | null;
      startDate: string;
      endDate: string;
    }>
  }>('/coupons'),
};

// Design Template API
export interface DesignTemplate {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  designData: DesignCanvasSnapshot | Record<string, unknown>; // Issue #105 - Replace any with proper type
  productCategoryId?: string | null;
  usageCount: number;
  likesCount: number;
  isFeatured: boolean;
  createdAt: string;
}

export const templateApi = {
  list: (params?: {
    category?: string;
    search?: string;
    featured?: boolean;
    limit?: number;
    offset?: number;
  }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.featured) query.append('featured', 'true');
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const queryString = query.toString();
    return api<{ data: DesignTemplate[]; pagination: any }>(`/templates${queryString ? `?${queryString}` : ''}`);
  },
  get: (id: string) => api<{ data: DesignTemplate }>(`/templates/${id}`),
  like: (id: string) => api(`/templates/${id}/like`, { method: 'POST' }),
};

// Design Comment API
export interface DesignComment {
  id: string;
  designId: string;
  userId?: string | null;
  parentId?: string | null;
  content: string;
  authorName?: string | null;
  likesCount: number;
  createdAt: string;
  replies?: DesignComment[];
}

export const designCommentApi = {
  list: (designId: string, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const queryString = query.toString();
    return api<{ data: DesignComment[]; pagination: any }>(`/designs/${designId}/comments${queryString ? `?${queryString}` : ''}`);
  },
  create: (designId: string, data: {
    content: string;
    parentId?: string;
    authorName?: string;
    authorEmail?: string;
  }) => api<{ data: DesignComment }>(`/designs/${designId}/comments`, {
    method: 'POST',
    body: data,
  }),
  like: (id: string) => api(`/comments/${id}/like`, { method: 'POST' }),
};

// Product Review API
// Note: ProductReview interface is already defined above, reusing it
// Extending the existing interface if needed

export interface ProductReviewStats {
  average: number;
  count: number;
  distribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export const productReviewApi = {
  list: (productId: string, params?: {
    page?: number;
    limit?: number;
    rating?: number;
    sort?: 'newest' | 'oldest' | 'helpful';
  }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.rating) query.append('rating', params.rating.toString());
    if (params?.sort) query.append('sort', params.sort);
    const queryString = query.toString();
    return api<{
      data: ProductReview[];
      pagination: any;
      stats: ProductReviewStats;
    }>(`/products/${productId}/reviews${queryString ? `?${queryString}` : ''}`);
  },
  create: (productId: string, data: {
    rating: number;
    title: string;
    comment: string;
    orderId?: string;
  }) => api<{ data: ProductReview }>(`/products/${productId}/reviews`, {
    method: 'POST',
    body: data,
  }),
  markHelpful: (id: string) => api(`/reviews/${id}/helpful`, { method: 'POST' }),
};

// Art Assets API
export interface ArtAsset {
  id: string;
  category: string;
  name: string;
  imageUrl: string;
  thumbnailUrl?: string | null;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  mimeType?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string | null;
  creator?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
}

export interface ArtAssetsResponse {
  success: boolean;
  data: Record<string, ArtAsset[]>;
  categories: string[];
}

export interface ArtAssetsByCategoryResponse {
  success: boolean;
  data: ArtAsset[];
}

export interface ArtAssetsListResponse {
  success: boolean;
  data: ArtAsset[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const artAssetsApi = {
  // Get all art assets grouped by category (public)
  getAll: async (): Promise<ArtAssetsResponse> => {
    return api<ArtAssetsResponse>('/art-assets');
  },

  // Get art assets by category (public)
  getByCategory: async (category: string): Promise<ArtAssetsByCategoryResponse> => {
    return api<ArtAssetsByCategoryResponse>(`/art-assets/category/${encodeURIComponent(category)}`);
  },
};

// Artworks API - 新的艺术作品 API，支持分类树、分页、搜索
export interface Artwork {
  id: string;
  title: string;
  slug: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  tags: string[];
  license?: string;
  attribution?: string;
  topCategory?: {
    id: string;
    name: string;
    slug: string;
  };
  subCategory?: {
    id: string;
    name: string;
    slug: string;
  };
}

export interface ArtworksResponse {
  success: boolean;
  data: Artwork[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  count: number;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    count: number;
  }>;
}

export interface CategoriesTreeResponse {
  success: boolean;
  data: CategoryNode[];
}

export const artworksApi = {
  // Get artworks with pagination, filtering, and search
  getArtworks: async (params?: {
    top?: string;
    sub?: string;
    query?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ArtworksResponse> => {
    const query = new URLSearchParams();
    if (params?.top) query.append('top', params.top);
    if (params?.sub) query.append('sub', params.sub);
    if (params?.query) query.append('query', params.query);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());

    const queryString = query.toString();
    return api<ArtworksResponse>(`/artworks${queryString ? `?${queryString}` : ''}`);
  },

  // Get categories tree with counts
  getCategoriesTree: async (): Promise<CategoriesTreeResponse> => {
    return api<CategoriesTreeResponse>('/artworks/categories/tree');
  },

  // Get single artwork
  getArtwork: async (id: string): Promise<{ success: boolean; data: Artwork }> => {
    return api<{ success: boolean; data: Artwork }>(`/artworks/${id}`);
  },
};

// Admin Art Assets API
export const adminArtAssetsApi = {
  // List all art assets (admin)
  list: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
  }): Promise<ArtAssetsListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.category) query.append('category', params.category);
    if (params?.isActive !== undefined) query.append('isActive', params.isActive.toString());

    const queryString = query.toString();
    return api<ArtAssetsListResponse>(`/admin/art-assets${queryString ? `?${queryString}` : ''}`);
  },

  // Get single art asset (admin)
  get: async (id: string): Promise<{ success: boolean; data: ArtAsset }> => {
    return api<{ success: boolean; data: ArtAsset }>(`/admin/art-assets/${id}`);
  },

  // Create art asset (admin)
  create: async (data: {
    category: string;
    name: string;
    image: File;
    sortOrder?: number;
  }): Promise<{ success: boolean; data: ArtAsset }> => {
    const formData = new FormData();
    formData.append('category', data.category);
    formData.append('name', data.name);
    formData.append('image', data.image);
    if (data.sortOrder !== undefined) {
      formData.append('sortOrder', data.sortOrder.toString());
    }

    return api<{ success: boolean; data: ArtAsset }>('/admin/art-assets', {
      method: 'POST',
      body: formData,
      headers: {}, // Let browser set Content-Type with boundary for FormData
    });
  },

  // Update art asset (admin)
  update: async (
    id: string,
    data: {
      category?: string;
      name?: string;
      image?: File;
      isActive?: boolean;
      sortOrder?: number;
    }
  ): Promise<{ success: boolean; data: ArtAsset }> => {
    const formData = new FormData();
    if (data.category) formData.append('category', data.category);
    if (data.name) formData.append('name', data.name);
    if (data.image) formData.append('image', data.image);
    if (data.isActive !== undefined) formData.append('isActive', data.isActive.toString());
    if (data.sortOrder !== undefined) formData.append('sortOrder', data.sortOrder.toString());

    return api<{ success: boolean; data: ArtAsset }>(`/admin/art-assets/${id}`, {
      method: 'PUT',
      body: formData,
      headers: {}, // Let browser set Content-Type with boundary for FormData
    });
  },

  // Delete art asset (admin)
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api<{ success: boolean; message: string }>(`/admin/art-assets/${id}`, {
      method: 'DELETE',
    });
  },
};

// Font interfaces
export interface Font {
  id: string;
  name: string;
  displayName?: string;
  previewText: string;
  category: 'latin' | 'chinese' | 'japanese' | 'hindi' | 'arabic' | 'korean' | 'thai';
  source: 'system' | 'google' | 'custom';
  googleFontFamily?: string | null;
  weights?: string[];
  isActive: boolean;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string | null;
}

export interface FontsResponse {
  success: boolean;
  data: Record<string, Font[]>;
  categories: string[];
}

export interface FontsByCategoryResponse {
  success: boolean;
  data: Font[];
}

export interface FontsListResponse {
  success: boolean;
  data: Font[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Fonts API (Public)
export const fontsApi = {
  // Get all fonts grouped by category (public)
  getAll: async (): Promise<FontsResponse> => {
    return api<FontsResponse>('/fonts');
  },

  // Get fonts by category (public)
  getByCategory: async (category: string): Promise<FontsByCategoryResponse> => {
    return api<FontsByCategoryResponse>(`/fonts/category/${encodeURIComponent(category)}`);
  },
};

// Admin Fonts API
// Admin Analytics API for Issue #160
export const adminAnalyticsApi = {
  getSales: (params?: { startDate?: string; endDate?: string; period?: 'day' | 'week' | 'month' }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.period) query.append('period', params.period);
    const queryString = query.toString();
    return api<{
      data: {
        overview: {
          totalRevenue: number;
          totalOrders: number;
          averageOrderValue: number;
          totalItemsSold: number;
        };
        revenueByPeriod: Array<{
          date: string;
          revenue: number;
          orders: number;
          items: number;
        }>;
        topProducts: Array<{
          productId: string;
          productName: string;
          sku: string;
          quantity: number;
          revenue: number;
        }>;
      };
    }>(`/admin/analytics/sales${queryString ? `?${queryString}` : ''}`);
  },
  getUsers: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    return api<{
      data: {
        overview: {
          totalUsers: number;
          activeCustomers: number;
          averageLifetimeValue: number;
        };
        usersByDate: Array<{ date: string; count: number }>;
        topCustomers: Array<{
          userId: string;
          email: string;
          name: string;
          totalSpent: number;
          orderCount: number;
          averageOrderValue: number;
        }>;
        registrationByDate: Array<{ date: string; count: number }>;
      };
    }>(`/admin/analytics/users${queryString ? `?${queryString}` : ''}`);
  },
  getProducts: (params?: { startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const queryString = query.toString();
    return api<{
      data: {
        overview: {
          totalProducts: number;
          activeProducts: number;
          totalItemsSold: number;
          totalRevenue: number;
        };
        topSellingProducts: Array<{
          productId: string;
          productName: string;
          sku: string;
          category: string;
          brand: string;
          quantity: number;
          revenue: number;
        }>;
        topRevenueProducts: Array<{
          productId: string;
          productName: string;
          sku: string;
          category: string;
          brand: string;
          quantity: number;
          revenue: number;
        }>;
        salesByCategory: Array<{
          category: string;
          quantity: number;
          revenue: number;
          productCount: number;
        }>;
      };
    }>(`/admin/analytics/products${queryString ? `?${queryString}` : ''}`);
  },
};

export const adminFontsApi = {
  // List all fonts (admin)
  list: async (params?: {
    page?: number;
    limit?: number;
    category?: string;
    isActive?: boolean;
    source?: string;
  }): Promise<FontsListResponse> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.category) query.append('category', params.category);
    if (params?.isActive !== undefined) query.append('isActive', params.isActive.toString());
    if (params?.source) query.append('source', params.source);

    const queryString = query.toString();
    return api<FontsListResponse>(`/admin/fonts${queryString ? `?${queryString}` : ''}`);
  },

  // Get single font (admin)
  get: async (id: string): Promise<{ success: boolean; data: Font }> => {
    return api<{ success: boolean; data: Font }>(`/admin/fonts/${id}`);
  },

  // Create font (admin)
  create: async (data: {
    name: string;
    displayName?: string;
    previewText?: string;
    category: 'latin' | 'chinese' | 'japanese' | 'hindi' | 'arabic' | 'korean' | 'thai';
    source: 'system' | 'google' | 'custom';
    googleFontFamily?: string;
    weights?: string[];
    isActive?: boolean;
    sortOrder?: number;
  }): Promise<{ success: boolean; data: Font }> => {
    return api<{ success: boolean; data: Font }>('/admin/fonts', {
      method: 'POST',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  // Update font (admin)
  update: async (
    id: string,
    data: {
      name?: string;
      displayName?: string;
      previewText?: string;
      category?: 'latin' | 'chinese' | 'japanese' | 'hindi' | 'arabic' | 'korean' | 'thai';
      source?: 'system' | 'google' | 'custom';
      googleFontFamily?: string;
      weights?: string[];
      isActive?: boolean;
      sortOrder?: number;
    }
  ): Promise<{ success: boolean; data: Font }> => {
    return api<{ success: boolean; data: Font }>(`/admin/fonts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  },

  // Delete font (admin)
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api<{ success: boolean; message: string }>(`/admin/fonts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Payment Method API for Issue #112
export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: string;
  cardBrand?: string | null;
  cardLast4?: string | null;
  cardExpMonth?: number | null;
  cardExpYear?: number | null;
  isDefault: boolean;
  billingDetails?: any | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavePaymentMethodPayload {
  paymentMethodId: string;
  isDefault?: boolean;
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
  };
}

export const paymentMethodsApi = {
  // Get user's payment methods
  list: () => api<{ paymentMethods: PaymentMethod[] }>('/payment-methods'),

  // Get payment method by ID
  get: (id: string) => api<{ paymentMethod: PaymentMethod }>(`/payment-methods/${id}`),

  // Save payment method
  save: (paymentMethodId: string, options?: { isDefault?: boolean; billingDetails?: any }) =>
    api<{ paymentMethod: PaymentMethod }>('/payment-methods', {
      method: 'POST',
      body: JSON.stringify({
        paymentMethodId,
        isDefault: options?.isDefault || false,
        billingDetails: options?.billingDetails || null,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    }),

  // Set payment method as default
  setDefault: (id: string) =>
    api<{ paymentMethod: PaymentMethod }>(`/payment-methods/${id}/default`, {
      method: 'PATCH',
    }),

  // Delete payment method
  delete: (id: string) =>
    api<{ success: boolean }>(`/payment-methods/${id}`, {
      method: 'DELETE',
    }),
};

// Customer Service Chat API for Issue #144
export interface ChatRoom {
  id: string;
  status: 'OPEN' | 'ASSIGNED' | 'ACTIVE' | 'RESOLVED' | 'CLOSED';
  customer: {
    id?: string;
    email?: string;
    name: string;
  };
  agent: {
    id: string;
    email: string;
    name: string;
  } | null;
  lastMessage: {
    id: string;
    content: string;
    senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
    createdAt: string;
  } | null;
  unreadCount: number;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  content: string;
  senderType: 'CUSTOMER' | 'AGENT' | 'SYSTEM';
  sender: {
    id: string;
    name: string;
  } | null;
  createdAt: string;
  isRead: boolean;
}

export const chatApi = {
  getRooms: () => api<{ rooms: ChatRoom[] }>('/chat/rooms'),
  createRoom: (data?: { customerName?: string; customerEmail?: string }) =>
    api<{ room: ChatRoom }>('/chat/rooms', { method: 'POST', body: data }),
  getRoom: (id: string) => api<{ room: ChatRoom }>(`/chat/rooms/${id}`),
  getMessages: (roomId: string, params?: { limit?: number; offset?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.offset) query.append('offset', params.offset.toString());
    const queryString = query.toString();
    return api<{ messages: ChatMessage[] }>(`/chat/rooms/${roomId}/messages${queryString ? `?${queryString}` : ''}`);
  },
  assignAgent: (roomId: string, agentId?: string) =>
    api<{ room: ChatRoom }>(`/chat/rooms/${roomId}/assign`, { method: 'PATCH', body: { agentId } }),
  updateStatus: (roomId: string, status: ChatRoom['status']) =>
    api<{ room: ChatRoom }>(`/chat/rooms/${roomId}/status`, { method: 'PATCH', body: { status } }),
};

// Unified Orders API (Online + Offline)
export const unifiedOrdersApi = {
  list: (params?: UnifiedOrderListParams) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.pageSize) query.append('pageSize', params.pageSize.toString());
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    if (params?.email) query.append('email', params.email);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    const queryString = query.toString();
    return api<{
      success: boolean;
      data: UnifiedOrderDTO[];
      pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
      };
      meta?: {
        aggregated: boolean;
        warnings?: string[];
      };
    }>(`/admin/all-orders${queryString ? `?${queryString}` : ''}`);
  },
  export: async (params?: UnifiedOrderListParams) => {
    const query = new URLSearchParams();
    if (params?.type) query.append('type', params.type);
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    if (params?.dateFrom) query.append('dateFrom', params.dateFrom);
    if (params?.dateTo) query.append('dateTo', params.dateTo);
    if (params?.email) query.append('email', params.email);
    const queryString = query.toString();
    const response = await fetch(`${API_BASE_URL}/admin/all-orders/export${queryString ? `?${queryString}` : ''}`, {
      credentials: 'include',
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || `Export failed: ${response.status}`);
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  },
};


// Website Content Types

// Production Template Management API (Admin)
export const activeWorkflowApi = {
  // Get active workflows for a specific product category
  getByCategory: (categorySlug: string) => api<{
    category: string;
    stages: Array<{
      key: string;
      label: string;
      description?: string;
      status: 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';
    }>;
  }>(`/production/active-workflows/${categorySlug}`),
};

// Shipping Settings API (Admin)
export interface ShippingSettingsPayload {
  standard: {
    enabled: boolean;
    cost: number;
    costUS: number; // Add US cost
    costIntl: number; // Add International cost
    estimatedDaysCA: number;
    estimatedDaysUS: number;
  };
  express: {
    enabled: boolean;
    cost: number;
    costUS: number; // Add US cost
    costIntl: number; // Add International cost
    estimatedDaysCA: number;
    estimatedDaysUS: number;
  };
}

export const adminShippingApi = {
  get: () => api<{ data: ShippingSettingsPayload }>('/admin/settings/shipping'),
  update: (data: ShippingSettingsPayload) =>
    api('/admin/settings/shipping', { method: 'PUT', body: data }),
};

// Shipping Template API Types
export interface ShippingRule {
  id?: string;
  templateId?: string;
  country: string | null;
  provinces: string[];
  postalCodePattern: string | null;
  startDate: string | null;
  endDate: string | null;
  seasonTag: string | null;
  minOrderAmount: number | null;
  maxOrderAmount: number | null;
  minWeight: number | null;
  maxWeight: number | null;
  shippingMethod: string;
  estimatedDays: number;
  cost: number;
  isFreeShipping: boolean;
}

export interface ShippingTemplate {
  id: string;
  name: string;
  description: string | null;
  priority: number;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
  rules: ShippingRule[];
  products?: Array<{
    id: string;
    templateId: string;
    productId: string;
    product: {
      id: string;
      name: string;
      sku: string;
    };
  }>;
  _count?: {
    rules: number;
    products: number;
  };
}

export interface ShippingTemplatePayload {
  name: string;
  description?: string | null;
  priority?: number;
  isActive?: boolean;
  startDate?: string | null;
  endDate?: string | null;
  rules: ShippingRule[];
  productIds?: string[];
}

export const shippingTemplateApi = {
  list: (includeInactive: boolean = false) =>
    api<{ templates: ShippingTemplate[] }>(`/admin/shipping-templates?includeInactive=${includeInactive}`),

  get: (id: string) =>
    api<{ template: ShippingTemplate }>(`/admin/shipping-templates/${id}`),

  create: (data: ShippingTemplatePayload) =>
    api<{ template: ShippingTemplate }>('/admin/shipping-templates', {
      method: 'POST',
      body: data
    }),

  update: (id: string, data: Partial<ShippingTemplatePayload>) =>
    api<{ template: ShippingTemplate }>(`/admin/shipping-templates/${id}`, {
      method: 'PATCH',
      body: data
    }),

  delete: (id: string) =>
    api<{ success: boolean }>(`/admin/shipping-templates/${id}`, {
      method: 'DELETE'
    }),

  duplicate: (id: string) =>
    api<{ template: ShippingTemplate }>(`/admin/shipping-templates/${id}/duplicate`, {
      method: 'POST'
    }),
};

export const adminReviewsApi = {
  list: (params: { page?: number; limit?: number; status?: string; sort?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.status && params.status !== 'all') q.set('status', params.status);
    if (params.sort) q.set('sort', params.sort);
    if (params.search) q.set('search', params.search);
    return api<{ data: any[]; pagination: any }>(`/admin/reviews?${q.toString()}`);
  },

  updateStatus: (id: string, action: 'approve' | 'reject' | 'hide' | 'restore') =>
    api<{ review: any }>(`/admin/reviews/${id}/status`, { method: 'PATCH', body: { action } }),

  reply: (id: string, reply: string) =>
    api<{ review: any }>(`/admin/reviews/${id}/reply`, { method: 'POST', body: { reply } }),

  delete: (id: string) =>
    api<{ success: boolean }>(`/admin/reviews/${id}`, { method: 'DELETE' }),

  getSettings: (productId: string) =>
    api<{ reviewsEnabled: boolean; maxDisplayCount: number }>(`/admin/products/${productId}/review-settings`),

  updateSettings: (productId: string, data: { reviewsEnabled: boolean; maxDisplayCount: number }) =>
    api<{ settings: any }>(`/admin/products/${productId}/review-settings`, { method: 'PUT', body: data }),
};

export const factoryQueueApi = {
  list: (params?: { status?: string; search?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status && params.status !== 'all') q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api<{ data: any[]; pagination: any; stats: any }>(`/admin/factory-queue${qs ? `?${qs}` : ''}`);
  },

  sendToFactory: (id: string, printSpecs?: { positions: string[]; method: string; widthCm?: number; heightCm?: number; notes?: string }) =>
    api<{ success: boolean; order: any; qrCode: string; printToken: string }>(
      `/admin/factory-queue/${id}/send-to-factory`,
      { method: 'POST', body: printSpecs ? { printSpecs } : undefined }
    ),

  updateProductionStatus: (id: string, productionStatus: string) =>
    api<{ success: boolean; order: any }>(`/admin/factory-queue/${id}/production-status`, {
      method: 'PATCH',
      body: { productionStatus },
    }),

  getFilmSheetData: (id: string) =>
    api<{ order: any; qrCode: string }>(`/admin/factory-queue/${id}/film-sheet`),

  getQR: (id: string) =>
    api<{ qrCode: string; printToken: string }>(`/admin/factory-queue/${id}/qr`),

  getGangSheetData: (ids: string[]) =>
    api<{ data: any[] }>(`/admin/factory-queue/gang-sheet?ids=${ids.join(',')}`),
};

// End of file

