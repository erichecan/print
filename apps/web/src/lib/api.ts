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
    shipping: number;
    tax: number;
    total: number;
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

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
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

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, config);
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
    try {
      const error = await response.json().catch(() => ({ error: response?.statusText || 'Unknown error' }));
      errorMessage = error.error || errorMessage;
    } catch {
      // 如果无法解析JSON，使用状态文本
      errorMessage = response?.statusText || 'Network error: Empty response from server';
    }
    throw new Error(errorMessage);
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
  rushDelivery: Array<{ name: string; count: number }>;
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
  prepare: (payload?: { shippingAddress?: CheckoutAddressPayload; shippingMethod?: string }) =>
    api('/checkout/prepare', {
      method: 'POST',
      ...(payload ? { body: payload } : {}),
    }),
  getShippingRates: (address: any) =>
    api('/checkout/shipping-rates', { method: 'POST', body: { address } }),
  createPaymentIntent: (shippingAddress: CheckoutAddressPayload, shippingMethod: string = 'standard') =>
    api<CheckoutPaymentIntentResponse>('/checkout/create-payment-intent', {
      method: 'POST',
      body: { shippingAddress, shippingMethod },
    }),
  confirm: (
    paymentIntentId: string,
    shippingAddress: CheckoutAddressPayload,
    billingAddress: CheckoutAddressPayload,
    shippingMethod: string,
    email: string
  ) =>
    api<CheckoutConfirmResponse>('/checkout/confirm', {
      method: 'POST',
      body: { paymentIntentId, shippingAddress, billingAddress, shippingMethod, email },
    }),
};

// Orders API
export const ordersApi = {
  list: (page: number = 1, limit: number = 20, status?: string, sort?: string) => {
    const query = new URLSearchParams();
    query.append('page', page.toString());
    query.append('limit', limit.toString());
    if (status) query.append('status', status);
    if (sort) query.append('sort', sort);
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
      trackingNumber?: string | null;
      carrier?: string | null;
      status: string;
      events: Array<{
        date: string;
        location?: string;
        status: string;
        description?: string;
      }>;
    }>(`/orders/${id}/tracking`),
};

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api('/auth/register', { method: 'POST', body: data }),
  login: (email: string, password: string) =>
    api('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  me: () => api<UserProfile>('/auth/me'),
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    api('/auth/me', { method: 'PATCH', body: data }),
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api('/auth/change-password', { method: 'POST', body: data }), // [2025-01-27 12:50:00] 密码修改API（需要后端实现）
  forgotPassword: (email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

// Address API
export const addressesApi = {
  list: () => api<Address[]>('/addresses'),
  get: (id: string) => api<Address>(`/addresses/${id}`),
  create: (data: AddressPayload) => api<Address>('/addresses', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AddressPayload>) =>
    api<Address>(`/addresses/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/addresses/${id}`, { method: 'DELETE' }),
  setDefault: (id: string) => api<Address>(`/addresses/${id}/set-default`, { method: 'POST' }),
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
  startDate?: string | null;
  endDate?: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export const adminPromotionsApi = {
  list: (params?: { search?: string; status?: 'all' | 'active' | 'inactive' }) => {
    const query = new URLSearchParams();
    if (params?.search) query.append('search', params.search);
    if (params?.status && params.status !== 'all') query.append('status', params.status);
    const queryString = query.toString();
    return api<{ data: AdminPromotion[] }>(`/admin/promotions${queryString ? `?${queryString}` : ''}`);
  },
  create: (data: Omit<AdminPromotion, 'id' | 'createdAt' | 'updatedAt'>) =>
    api<{ data: AdminPromotion }>('/admin/promotions', { method: 'POST', body: data }),
  update: (id: string, data: Partial<Omit<AdminPromotion, 'id' | 'createdAt' | 'updatedAt'>>) =>
    api<{ data: AdminPromotion }>(`/admin/promotions/${id}`, { method: 'PUT', body: data }),
  remove: (id: string) => api(`/admin/promotions/${id}`, { method: 'DELETE' }),
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

export interface ContentConfig {
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
}

export interface AdminOrderUpdatePayload {
  status?: string;
  paymentStatus?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
}

export interface AdminAuditLogEntry {
  id: string;
  action: string;
  actorName?: string;
  actorEmail?: string; // [2025-11-14 01:05:00] 添加 actorEmail 字段
  createdAt: string;
  metadata?: any;
  meta?: any; // [2025-11-14 00:58:00] 添加 meta 字段（metadata 的别名）
}

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
  recordRefund: (id: string, payload: AdminOrderRefundPayload) =>
    api(`/admin/orders/${id}/refund`, { method: 'POST', body: payload }),
  auditTrail: (id: string, params?: { limit?: number }) => {
    const query = new URLSearchParams();
    if (params?.limit) query.append('limit', params.limit.toString());
    const queryString = query.toString();
    return api(`/admin/orders/${id}/audit-trail${queryString ? `?${queryString}` : ''}`);
  },
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

export default api;
