/**
 * API Client
 * [2025-11-05 00:10:00]
 * [2025-01-27 13:35:00] Restored complete API file and added product reviews API
 * [2025-11-15 11:20:00] 使用集中管理的 API 配置
 */
import { API_BASE_URL } from './api-config';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';
  body?: any;
  headers?: Record<string, string>;
}

// [2025-11-10 22:49:14] Typed checkout payment intent response
interface CheckoutPaymentIntentResponse {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  currency: string;
  breakdown?: {
    subtotal: number;
    promotionDiscount?: number; // [2025-01-28 12:30:00] 促销折扣
    discount?: number; // [2025-01-28 11:35:00] 总折扣（促销+优惠券）
    shipping: number;
    tax: number;
    total: number;
  };
  promotions?: Array<{ // [2025-01-28 12:30:00] 促销活动信息
    promotionId: string;
    promotionTitle: string;
    productId: string;
    discountAmount: number;
  }>;
  coupon?: { // [2025-01-28 11:35:00] 添加优惠券信息
    id: string;
    code: string;
    type: string;
  };
}

// [2025-11-10 22:50:18] Typed checkout confirm response
interface CheckoutConfirmResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  email: string;
}

// [2025-11-10 22:51:42] Cart response types
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

// [2025-11-12 03:05:00] Product type for related products API
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
  // [2025-01-28 12:30:00] 促销活动信息
  promotions?: Promotion[];
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

// [2025-01-27 13:35:00] Product Review types
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

export interface ProductReviewsResponse {
  reviews: ProductReview[];
  summary: ProductReviewSummary;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProductReviewPayload {
  rating: number;
  title: string;
  comment: string;
  productId: string;
  orderId?: string;
}

// [2025-11-12 00:45:10] Checkout address payload
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

// [2025-11-12 06:32:00] User profile type
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role?: string; // [2025-11-15 12:05:00] 添加角色字段
  emailVerified?: boolean; // [2025-11-15 12:05:00] 添加邮箱验证字段
  createdAt?: string;
  updatedAt?: string;
}

// [2025-11-12 06:42:30] Order detail type
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
  shippingAddress?: any;
  billingAddress?: any;
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

// [2025-12-02 04:20:00] 需要认证的 API 路径前缀
// [2025-12-02 04:49:00] 增加 /sales 以支持 Sales 订单管理
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
  return AUTH_REQUIRED_PATHS.some(prefix => path.startsWith(prefix));
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  // [2025-12-02 04:20:00] 检查是否需要使用代理路由
  const useProxy = requiresAuthProxy(endpoint);
  
  // [2025-12-02 04:20:00] 确定请求 URL
  const baseUrl = useProxy 
    ? (typeof window !== 'undefined' ? window.location.origin : '')
    : API_BASE_URL;
  const requestUrl = useProxy 
    ? `${baseUrl}/api/proxy${endpoint}`
    : `${baseUrl}${endpoint}`;

  const config: RequestInit = {
    method,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    credentials: 'include',
  };

  if (body && method !== 'GET') {
    config.body = isFormData ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(requestUrl, config);
  } catch (error: unknown) {
    // [2025-01-27 16:10:00] 处理网络错误（连接被拒绝、空响应等）
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('Network error: Unable to connect to server. Please check if the backend server is running.');
    }
    throw error;
  }

  // [2025-01-27 16:10:00] 处理空响应
  if (!response || !response.ok) {
    let errorMessage = `API Error: ${response?.status || 'Unknown'}`;
    let errorDetails: any = null;
    try {
      const errorText = await response.text();
      if (errorText) {
        try {
          errorDetails = JSON.parse(errorText);
          errorMessage = errorDetails.error || errorDetails.message || errorMessage;
          // [2025-01-27] 如果有详细信息，添加到错误消息中
          if (errorDetails.details && process.env.NODE_ENV === 'development') {
            errorMessage += `: ${errorDetails.details}`;
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
    
    // [2025-01-27] 添加更详细的错误信息用于调试
    const fullError = new Error(errorMessage);
    (fullError as any).status = response?.status;
    (fullError as any).details = errorDetails;
    throw fullError;
  }

  // [2025-01-27 16:10:00] 处理空响应体
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

// [2025-01-27 17:00:00] Filter options types
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
  // [2025-01-27 17:00:00] 获取筛选选项统计数据
  getFilterOptions: (params?: { collection?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.collection) query.append('collection', params.collection);
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString();
    return api<FilterOptions>(`/products/filters/options${queryString ? `?${queryString}` : ''}`);
  },
  getBySlug: (slug: string) => api(`/products/${slug}`),
  // [2025-11-21 11:00:00] 根据 variantId 获取产品信息（用于 Design Lab）
  getByVariant: (variantId: string) => api<{
    productId: string;
    productName: string;
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
    }), // [2025-01-27 13:35:00] 提交产品评价API（需要后端实现）
};

// Collections API
export const collectionsApi = {
  list: () => api('/collections'),
  getBySlug: (slug: string) => api(`/collections/${slug}`),
};

// [2025-01-27 18:50:00] Categories API (Public)
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
export const cartApi = {
  get: () => api<CartResponse>('/cart'),
  addItem: (variantId: string, quantity: number = 1, designId?: string) =>
    api('/cart/items', { method: 'POST', body: { variantId, quantity, ...(designId && { designId }) } }),
  updateItem: (itemId: string, quantity: number) =>
    api(`/cart/items/${itemId}`, { method: 'PATCH', body: { quantity } }),
  removeItem: (itemId: string) =>
    api(`/cart/items/${itemId}`, { method: 'DELETE' }),
  clear: () => api('/cart', { method: 'DELETE' }),
};

// Checkout API
export const checkoutApi = {
  prepare: (payload?: { shippingAddress?: CheckoutAddressPayload; shippingMethod?: string; couponCode?: string }) =>
    api('/checkout/prepare', {
      method: 'POST',
      ...(payload ? { body: payload } : {}),
    }),
  getShippingRates: (address: any) =>
    api('/checkout/shipping-rates', { method: 'POST', body: { address } }),
  // [2025-01-28 11:35:00] 添加优惠券支持
  createPaymentIntent: (
    shippingAddress: CheckoutAddressPayload,
    shippingMethod: string = 'standard',
    couponCode?: string,
    couponId?: string
  ) =>
    api<CheckoutPaymentIntentResponse>('/checkout/create-payment-intent', {
      method: 'POST',
      body: { shippingAddress, shippingMethod, ...(couponCode ? { couponCode } : {}), ...(couponId ? { couponId } : {}) },
    }),
  // [2025-01-28 11:35:00] 添加优惠券支持
  confirm: (
    paymentIntentId: string,
    shippingAddress: CheckoutAddressPayload,
    billingAddress: CheckoutAddressPayload,
    shippingMethod: string,
    email: string,
    couponCode?: string,
    couponId?: string
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
      },
    }),
};

// Designs API (User)
export interface UserDesign {
  id: string;
  name: string;
  thumbnailUrl?: string | null;
  createdAt: string;
  productName?: string | null;
}

export const designsApi = {
  list: () => api<{ designs: UserDesign[]; total: number }>('/user/designs'),
  get: (id: string) => api<{ data: any }>(`/designs/${id}`),
  delete: (id: string) => api(`/designs/${id}`, { method: 'DELETE' }),
};

// Orders API
// [2025-12-06 13:30:00] Enhanced with search, paymentStatus filter, and proper sorting
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
    // [2025-12-06 13:30:00] Parse sort parameter (format: "field_order" e.g., "createdAt_desc")
    if (sort) {
      const [sortBy, sortOrder] = sort.split('_');
      if (sortBy) query.append('sortBy', sortBy);
      if (sortOrder) query.append('sortOrder', sortOrder);
    }
    return api<{ orders: AccountOrderDetail[]; pagination?: any } | { data: AccountOrderDetail[]; pagination?: any }>(`/orders?${query.toString()}`);
  },
  getById: (id: string) => api<AccountOrderDetail>(`/orders/${id}`),
  getByOrderNumber: (orderNumber: string, email: string) =>
    api<AccountOrderDetail>(`/orders/number/${orderNumber}?email=${encodeURIComponent(email)}`),
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
// [2025-01-29 02:20:00] 创建同域 API 调用函数（用于登录相关请求，避免跨域 Cookie 问题）
async function sameOriginApi<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  
  const config: RequestInit = {
    method,
    headers: {
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    credentials: 'include',
  };
  
  if (body && method !== 'GET') {
    config.body = isFormData ? body : JSON.stringify(body);
  }
  
  // 使用同源 API 路由（Next.js API Routes）
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const response = await fetch(`${baseUrl}${endpoint}`, config);
  
  if (!response.ok) {
    // [2025-12-03 03:55:00] 对于 401 错误，抛出特殊错误以便调用方识别
    if (response.status === 401) {
      const error = new Error('UNAUTHORIZED');
      (error as any).status = 401;
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
  // [2025-01-29 02:20:00] 使用同域 API 路由，避免跨域 Cookie 问题
  login: (email: string, password: string) =>
    sameOriginApi('/api/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  // [2025-01-29 02:20:00] 使用同域 API 路由，避免跨域 Cookie 问题
  // [2025-12-03 03:55:00] 静默处理 401 错误（未登录是正常状态）
  me: async () => {
    try {
      return await sameOriginApi<UserProfile>('/api/auth/me');
    } catch (err: any) {
      // 401 错误表示用户未登录，这是正常状态，不抛出错误
      if (err?.message?.includes('401') || err?.message?.includes('Unauthorized')) {
        throw new Error('UNAUTHORIZED'); // 使用特殊错误标识，让调用方可以区分
      }
      throw err;
    }
  },
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    api('/auth/me', { method: 'PATCH', body: data }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api('/auth/me/password', { method: 'PUT', body: data }), // [2025-01-27 修复] 密码修改API路径修复为PUT /auth/me/password
  forgotPassword: (email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

// [2025-12-02 04:49:00] Sales Offline Orders API
export interface SalesOfflineOrderSummary {
  id: string;
  orderCode: string;
  projectName: string;
  primaryProduct: string | null;
  quantity: number | null;
  deliveryDate: string | null;
  status: string;
  rushOrder: boolean;
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
  createdAt: string;
  updatedAt: string;
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

// [2025-01-28 21:30:00] 订单配置数据结构类型定义
export interface OfflineOrderProductItem {
  id: string;
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
  width: string;
  height: string;
  notes: string;
  index?: number;
}

export interface OfflineOrderPricing {
  subtotal: number;
  discount: number;
  discountAmount: number;
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
}

export interface OfflineOrderConfiguration {
  source?: string;
  orderCode?: string;
  artworkNotes?: string;
  productItems?: OfflineOrderProductItem[];
  sideCount?: number;
  printPositions?: OfflineOrderPrintPosition[];
  requiresInvoice?: boolean;
  invoiceInfo?: OfflineOrderInvoiceInfo | null;
  pricing?: OfflineOrderPricing;
}

export interface SalesOfflineOrderDetail extends SalesOfflineOrderSummary {
  // [2025-01-28 21:30:00] 详情接口包含的额外字段
  description?: string | null; // 设计说明
  requiresMockups?: boolean;
  requiresProof?: boolean;
  configuration?: OfflineOrderConfiguration | null; // 完整配置信息
  metadata?: any;
  assets: any[];
  histories: any[];
  productionWorkOrder: any | null;
}

export const salesOrdersApi = {
  list: (params?: { page?: number; limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', String(params.page));
    if (params?.limit) query.append('limit', String(params.limit));
    const qs = query.toString();
    return api<SalesOfflineOrderListResponse>(`/sales/orders${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) =>
    api<{ order: SalesOfflineOrderDetail }>(`/sales/orders/${id}`).then((res) => res.order),
};

// [2025-12-06 17:00:00] Offline Order Product Configuration API
// 获取线下订单配置数据（产品、颜色、尺寸费用、可用性等）
export interface OfflineOrderProduct {
  id: string;
  name: string;
  categoryId: string;
  categoryName: string;
  basePrice: number;
}

export interface OfflineOrderColor {
  id: string;
  name: string;
  hex?: string;
}

export interface OfflineOrderSizeFee {
  size: string;
  additionalFee: number;
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

export const offlineOrderProductApi = {
  // [2025-12-06 17:00:00] 获取订单配置数据
  getOrderConfig: () => sameOriginApi<OfflineOrderConfig>('/api/offline-order-products/config'),
};

// Address API
export const addressesApi = {
  list: () => api<Address[]>('/addresses'),
  get: (id: string) => api<Address>(`/addresses/${id}`),
  create: (data: AddressPayload) => api<Address>('/addresses', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AddressPayload>) =>
    api<Address>(`/addresses/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/addresses/${id}`, { method: 'DELETE' }),
  setDefault: (id: string) => api<Address>(`/addresses/${id}/set-default`, { method: 'PATCH' }), // [2025-01-27 修复] 修复API方法为PATCH
};

// [2025-01-27] User Preferences API Types
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

// [2025-01-27] User Preferences API
export const userPreferencesApi = {
  get: () => api<UserPreferencesResponse>('/user/preferences'),
  update: (data: Partial<UserPreferences>) =>
    api<UserPreferencesResponse>('/user/preferences', { method: 'PUT', body: data }),
};

// [2025-01-27 15:00:00] Admin API Types
export interface AdminCategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
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
}

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
  category?: {
    id: string;
    name: string;
  } | null;
  primaryImage?: {
    url: string;
    alt?: string | null;
  } | null;
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
  isCustomizable?: boolean;
  weight?: number;
  dimensions?: string;
  variants?: Array<{
    sku: string;
    color?: string;
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
  collections?: string[];
}

// [2025-01-27 15:00:00] Admin Categories API
export const adminCategoriesApi = {
  list: (params?: { page?: number; limit?: number; search?: string; status?: 'active' | 'inactive' }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    const queryString = query.toString();
    return api<{ data: AdminCategorySummary[]; pagination: any }>(
      `/admin/categories${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminCategoryDetail>(`/admin/categories/${id}`),
  create: (data: AdminCategoryPayload) =>
    api<AdminCategoryDetail>('/admin/categories', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AdminCategoryPayload>) =>
    api<AdminCategoryDetail>(`/admin/categories/${id}`, { method: 'PUT', body: data }),
  archive: (id: string) => api(`/admin/categories/${id}`, { method: 'DELETE' }),
};

// [2025-01-27 15:00:00] Admin Products API
// [2025-12-06 16:00:00] Inventory Alert API Types
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
  // [2025-12-06 16:00:00] Get low stock products
  getLowStock: (threshold?: number) => {
    const query = new URLSearchParams();
    if (threshold !== undefined) query.append('threshold', threshold.toString());
    return api<{ products: LowStockProduct[]; count: number; threshold: number }>(
      `/admin/products/low-stock${query.toString() ? `?${query.toString()}` : ''}`
    );
  },
  // [2025-12-06 16:00:00] Get out of stock products
  getOutOfStock: () => api<{ products: LowStockProduct[]; count: number }>('/admin/products/out-of-stock'),
  // [2025-12-06 16:00:00] Get inventory alerts summary
  getAlerts: (threshold?: number) => {
    const query = new URLSearchParams();
    if (threshold !== undefined) query.append('threshold', threshold.toString());
    return api<InventoryAlerts>(`/admin/inventory/alerts${query.toString() ? `?${query.toString()}` : ''}`);
  },
  // [2025-12-06 16:00:00] Get low stock threshold for a variant
  getThreshold: (variantId: string) =>
    api<{
      variantId: string;
      sku: string;
      productName: string;
      lowStockThreshold: number | null;
      currentStock: number;
      effectiveThreshold: number;
    }>(`/admin/products/variants/${variantId}/low-stock-threshold`),
  // [2025-12-06 16:00:00] Update low stock threshold for a variant
  updateThreshold: (variantId: string, threshold: number | null) =>
    api<{
      id: string;
      sku: string;
      productName: string;
      lowStockThreshold: number | null;
      currentStock: number;
    }>(`/admin/products/variants/${variantId}/low-stock-threshold`, {
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
      `/admin/products${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminProductDetail>(`/admin/products/${id}`),
  create: (data: AdminProductPayload) =>
    api<AdminProductDetail>('/admin/products', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AdminProductPayload>) =>
    api<AdminProductDetail>(`/admin/products/${id}`, { method: 'PUT', body: data }),
  archive: (id: string) => api(`/admin/products/${id}`, { method: 'DELETE' }),
  updateStatus: (id: string, isActive: boolean) =>
    api<AdminProductDetail>(`/admin/products/${id}/status`, { method: 'PATCH', body: { isActive } }),
  uploadImages: async (productId: string, files: File[], altTexts?: string[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    if (altTexts && altTexts.length > 0) {
      formData.append('alt', altTexts.join(','));
    }
    const response = await fetch(`${API_BASE_URL}/admin/products/${productId}/images`, {
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
  deleteImage: (productId: string, imageId: string) =>
    api(`/admin/products/${productId}/images/${imageId}`, { method: 'DELETE' }),
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
  create: (data: AdminCreateUserPayload) => // [2025-01-28 18:35:00] 创建新用户
    api<AdminCreateUserResponse>('/admin/users', { method: 'POST', body: data }),
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
  canvasSnapshot: any;
  pricingSnapshot?: any;
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
  // [2025-12-06 17:30:00] Get coupon statistics for Issue #138
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
  // [2025-12-06 17:30:00] Get coupon detail statistics
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
  // [2025-01-28 12:30:00] 折扣相关字段
  // [2025-12-06 18:00:00] Support buy-get-free type for Issue #139
  discountType: 'percentage' | 'fixed' | 'buy_get_free';
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  // [2025-12-06 18:00:00] Buy-get-free promotion fields for Issue #139
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
  // [2025-01-28 12:30:00] 关联数据
  products?: Array<{ id: string; name: string; slug: string }>;
  categories?: Array<{ id: string; name: string; slug: string }>;
  coupon?: { id: string; code: string; type: string } | null;
}

// [2025-01-28 12:30:00] 公共促销活动接口
export interface Promotion {
  id: string;
  title: string;
  description?: string;
  bannerImageUrl?: string;
  linkUrl?: string;
  // [2025-12-06 18:00:00] Support buy-get-free type for Issue #139
  discountType: 'percentage' | 'fixed' | 'buy_get_free';
  discountValue: number;
  minOrderValue?: number | null;
  maxDiscount?: number | null;
  // [2025-12-06 18:00:00] Buy-get-free promotion fields for Issue #139
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
  // [2025-01-28 12:30:00] 商品关联管理
  addProducts: (id: string, productIds: string[]) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/products`, { method: 'POST', body: { productIds } }),
  removeProduct: (id: string, productId: string) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/products/${productId}`, { method: 'DELETE' }),
  // [2025-01-28 12:30:00] 类目关联管理
  addCategories: (id: string, categoryIds: string[]) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/categories`, { method: 'POST', body: { categoryIds } }),
  removeCategory: (id: string, categoryId: string) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/categories/${categoryId}`, { method: 'DELETE' }),
  // [2025-01-28 12:30:00] 优惠券关联管理
  setCoupon: (id: string, couponId: string | null) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}/coupon`, { method: 'PUT', body: { couponId } }),
};

// [2025-01-28 12:30:00] 公共促销活动 API
export const promotionApi = {
  getActive: () => api<{ promotions: Promotion[] }>('/promotions'),
  getForProduct: (productId: string) => api<{ promotions: Promotion[] }>(`/promotions/product/${productId}`),
  getForCategory: (categoryId: string) => api<{ promotions: Promotion[] }>(`/promotions/category/${categoryId}`),
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

// [2025-01-28 05:50:00] 导航菜单项类型
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

// [2025-01-28 05:50:00] 首页内容类型
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

// [2025-01-28 05:50:00] 关于页内容类型
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

// [2025-01-28 05:50:00] 帮助页内容类型
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

// [2025-01-28 05:50:00] 通用静态文字类型
export interface StaticTexts {
  topMessageBar: string;
  footerColumns: Array<{
    id: string;
    title: string;
    links: Array<{
      id: string;
      label: string;
      href: string;
    }>;
  }>;
  footerCopyright: string;
}

export interface ContentConfig {
  // [2025-01-28 05:50:00] 保留原有字段以向后兼容
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
  // [2025-01-28 05:50:00] 新增 CMS 字段
  navigation?: NavigationMenuItem[];
  homePage?: HomePageContent;
  aboutPage?: AboutPageContent;
  helpPage?: HelpPageContent;
  staticTexts?: StaticTexts;
}

export const adminSettingsApi = {
  getSite: () => api<{ data: SiteSettingsPayload }>('/admin/settings/site'),
  updateSite: (data: SiteSettingsPayload) =>
    api<{ data: SiteSettingsPayload }>('/admin/settings/site', { method: 'PUT', body: data }),
};

export const adminContentApi = {
  get: () => api<{ data: ContentConfig }>('/admin/settings/content'),
  update: (data: ContentConfig) =>
    api<{ data: ContentConfig }>('/admin/settings/content', { method: 'PUT', body: data }),
  // [2025-01-28 05:50:00] 图片上传 API
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

// [2025-01-28 06:20:00] 公共内容 API（不需要认证，供前端展示使用）
export const contentApi = {
  get: () => api<{ data: ContentConfig }>('/content'),
};

// [2025-11-16 16:05:00] Production templates types & APIs
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

// [2025-01-27 16:15:00] Design Lab API Types
export interface DesignCanvasSnapshot {
  size: { width: number; height: number };
  objects: any[];
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
  pricingSnapshot?: any | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDesignDraftPayload {
  productVariantId: string;
  name?: string;
  canvas?: DesignCanvasSnapshot;
  pricing?: any;
}

export interface UpdateDesignDraftPayload {
  name?: string;
  canvas?: DesignCanvasSnapshot;
  pricing?: any;
  thumbnailUrl?: string;
  summary?: string;
}

// [2025-01-30 23:55:00] Product Color Image API
export const productColorImageApi = {
  getColorMapping: (productId: string) =>
    api<{ data: { productId: string; mapping: Record<string, string>; colors: Array<{ colorId: string; colorName: string; colorHex: string | null; imageUrls: { front: string; back: string; sleeve: string } }> } }>(`/product-color-images/mapping/${productId}`),
  getImageUrlByColor: (productId: string, colorName: string, view: 'front' | 'back' | 'sleeve' = 'front') =>
    api<{ data: { colorId: string; colorName: string; colorHex: string | null; imageUrl: string; view: string; allViews: { front: string; back: string; sleeve: string } } }>(`/product-color-images/by-color/${productId}/${encodeURIComponent(colorName)}?view=${view}`),
  getAll: (productId?: string) =>
    api<{ data: Array<any>; count: number }>(`/product-color-images${productId ? `?productId=${productId}` : ''}`),
};

// [2025-01-27 16:15:00] Design Lab API
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
};

// [2025-01-27 16:15:00] Admin Orders API Types
export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  customerEmail?: string | null;
  customerName?: string | null;
  itemCount?: number; // [2025-11-14 01:00:00] 添加 itemCount 字段
  items?: any[]; // [2025-11-14 01:01:00] 添加 items 字段
  subtotal?: number; // [2025-11-14 01:02:00] 添加 subtotal 字段
  shippingCost?: number; // [2025-11-14 01:02:00] 添加 shippingCost 字段
  tax?: number; // [2025-11-14 01:02:00] 添加 tax 字段
  discount?: number; // [2025-11-14 01:02:00] 添加 discount 字段
  shippingAddress?: any; // [2025-11-14 01:02:00] 添加 shippingAddress 字段
  billingAddress?: any; // [2025-11-14 01:03:00] 添加 billingAddress 字段
  shipments?: any[]; // [2025-11-14 01:04:00] 添加 shipments 字段
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
  amount?: number; // [2025-12-06 14:00:00] Support partial refund
  refundToStripe?: boolean; // [2025-12-06 14:00:00] Whether to process refund via Stripe
}

export interface AdminOrderUpdatePayload {
  status?: string;
  paymentStatus?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
}

// [2025-01-28 08:30:00] Audit Logs 功能已移除

// [2025-01-27 16:15:00] Admin Orders API
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
  // [2025-12-06 16:40:00] Batch operations for Issue #87
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
  // [2025-12-06 15:30:00] EasyShip shipping label APIs
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
  // [2025-01-28 08:30:00] auditTrail 功能已移除
};

// [2025-01-27 16:15:00] Admin Offline Orders API Types
// [2025-11-15 15:02:30] Offline order stage metadata aligned with backend payload
export interface OfflineOrderStageMeta {
  key: string;
  label: string;
  description?: string;
  position?: number;
}

// [2025-11-15 15:02:30] Offline order contact shape used across admin views
export interface OfflineOrderContact {
  name: string;
  company?: string | null;
  email: string;
  phone?: string | null;
}

// [2025-11-15 15:02:30] Offline order asset metadata for intake uploads
export interface OfflineOrderAsset {
  id: string;
  fileName: string;
  fileSize: number;
  contentType?: string | null;
  url: string;
  uploadedAt?: string;
  uploadedBy?: string | null;
}

// [2025-11-15 15:02:30] Offline order history entry for stage tracking
export interface OfflineOrderHistoryEntry {
  id: string;
  fromStageKey?: string | null;
  toStageKey: string;
  actorId?: string | null;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
}

// [2025-11-15 15:02:30] Production work order event timeline definition
export interface ProductionWorkOrderEvent {
  id: string;
  status: string;
  actorId?: string | null;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
}

// [2025-11-15 15:02:30] Production work order detail returned by backend
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

// [2025-11-15 15:02:30] Admin offline order summary aligned with mapOrder response
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
  createdAt: string;
  updatedAt: string;
}

// [2025-11-15 15:02:30] Admin offline order detail extends summary with histories
export interface AdminOfflineOrderDetail extends AdminOfflineOrderSummary {
  histories: OfflineOrderHistoryEntry[];
}

// [2025-11-15 15:02:30] Offline order list response with pagination and stage config
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

// [2025-11-15 15:02:30] Metrics payload for offline operations dashboard
export interface OfflineOrderMetricsResponse {
  summary: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    rushActive: number;
  };
  stages: Array<
    OfflineOrderStageMeta & {
      count: number;
    }
  >;
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

// [2025-11-15 15:02:30] Admin Offline Orders API aligned with backend routes
export const adminOfflineOrdersApi = {
  list: (params?: { stageKey?: string; search?: string; rush?: boolean; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.stageKey) query.append('stageKey', params.stageKey);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    if (params?.rush !== undefined) query.append('rush', params.rush ? 'true' : 'false');
    const queryString = query.toString();
    return api<AdminOfflineOrderListResponse>(
      `/admin/offline-orders${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<{ order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}`),
  getMetrics: () => api<OfflineOrderMetricsResponse>('/admin/offline-orders/metrics/summary'),
  updateStage: (id: string, payload: { stageKey: string; note?: string }) =>
    api(`/admin/offline-orders/${id}/stage`, { method: 'PATCH', body: payload }),
  addNote: (id: string, note: string) =>
    api(`/admin/offline-orders/${id}/notes`, { method: 'POST', body: { note } }),
  uploadAssets: async (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('assets', file));
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
};

// [2025-12-06 17:10:00] Supplier API for Issue #89
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

// [2025-01-27 19:15:00] Contact form API
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

// [2025-01-27 19:45:00] Coupon API
export const couponApi = {
  validate: (code: string, subtotal: number, userId?: string) =>
    api('/coupons/validate', {
      method: 'POST',
      body: { code, subtotal, userId },
    }),
  getActive: () => api<{ coupons: Array<{
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    minOrderValue: number | null;
    maxDiscount: number | null;
    startDate: string;
    endDate: string;
  }>}>('/coupons'),
};

// [2025-01-27 21:50:00] Design Template API
export interface DesignTemplate {
  id: string;
  name: string;
  description?: string | null;
  category?: string | null;
  tags: string[];
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  designData: any;
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

// [2025-01-27 21:50:00] Design Comment API
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

// [2025-01-27 21:50:00] Product Review API
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

// [2025-01-28 01:00:00] Art Assets API
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
  // [2025-01-28 01:00:00] Get all art assets grouped by category (public)
  getAll: async (): Promise<ArtAssetsResponse> => {
    return api<ArtAssetsResponse>('/art-assets');
  },

  // [2025-01-28 01:00:00] Get art assets by category (public)
  getByCategory: async (category: string): Promise<ArtAssetsByCategoryResponse> => {
    return api<ArtAssetsByCategoryResponse>(`/art-assets/category/${encodeURIComponent(category)}`);
  },
};

// [2025-01-28 01:00:00] Admin Art Assets API
export const adminArtAssetsApi = {
  // [2025-01-28 01:00:00] List all art assets (admin)
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

  // [2025-01-28 01:00:00] Get single art asset (admin)
  get: async (id: string): Promise<{ success: boolean; data: ArtAsset }> => {
    return api<{ success: boolean; data: ArtAsset }>(`/admin/art-assets/${id}`);
  },

  // [2025-01-28 01:00:00] Create art asset (admin)
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

  // [2025-01-28 01:00:00] Update art asset (admin)
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

  // [2025-01-28 01:00:00] Delete art asset (admin)
  delete: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api<{ success: boolean; message: string }>(`/admin/art-assets/${id}`, {
      method: 'DELETE',
    });
  },
};

// [2025-01-30 19:00:00] Font interfaces
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

// [2025-01-30 19:00:00] Fonts API (Public)
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

// [2025-01-30 19:00:00] Admin Fonts API
// [2025-12-06 21:30:00] Admin Analytics API for Issue #160
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

// [2025-12-06 17:20:00] Payment Method API for Issue #112
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
  // [2025-12-06 17:20:00] Get user's payment methods
  list: () => api<{ paymentMethods: PaymentMethod[] }>('/payment-methods'),

  // [2025-12-06 17:20:00] Get payment method by ID
  get: (id: string) => api<{ paymentMethod: PaymentMethod }>(`/payment-methods/${id}`),

  // [2025-12-06 17:20:00] Save payment method
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

  // [2025-12-06 17:20:00] Set payment method as default
  setDefault: (id: string) =>
    api<{ paymentMethod: PaymentMethod }>(`/payment-methods/${id}/default`, {
      method: 'PATCH',
    }),

  // [2025-12-06 17:20:00] Delete payment method
  delete: (id: string) =>
    api<{ success: boolean }>(`/payment-methods/${id}`, {
      method: 'DELETE',
    }),
};

// [2025-12-07 01:30:00] Customer Service Chat API for Issue #144
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

export default api;
