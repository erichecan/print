/**
 * API Client
 * [2025-11-05 00:10:00]
 * [2025-01-27 13:35:00] Restored complete API file and added product reviews API
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

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
  rating: number;
  title: string;
  comment: string;
  isVerifiedPurchase: boolean;
  createdAt: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  return response.json();
}

// Products API
export const productsApi = {
  list: (params?: { page?: number; limit?: number; category?: string; search?: string; sort?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    const queryString = query.toString();
    return api(`/products${queryString ? `?${queryString}` : ''}`);
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

// Cart API
export const cartApi = {
  get: () => api<CartResponse>('/cart'),
  addItem: (variantId: string, quantity: number = 1) =>
    api('/cart/items', { method: 'POST', body: { variantId, quantity } }),
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
    return api(`/orders?${query.toString()}`);
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
  _count?: {
    products: number;
    children: number;
  };
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
  list: (params?: { page?: number; limit?: number; search?: string; status?: 'active' | 'inactive' }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
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
      method: 'PUT',
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
export interface AdminOfflineOrderSummary {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  total: number;
  currency: string;
  stage: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminOfflineOrderDetail extends AdminOfflineOrderSummary {
  items?: any[];
  notes?: any[];
  assets?: any[];
  productionWorkOrder?: any;
}

export interface AdminOfflineOrderListResponse {
  orders: AdminOfflineOrderSummary[];
  metrics?: any;
}

export type OfflineOrderStage = string;

export interface ProductionWorkOrderPayload {
  status?: string;
  priority?: number;
  startDate?: string | null;
  dueDate?: string | null;
  assigneeId?: string;
  assigneeName?: string;
  eventNote?: string;
}

// [2025-01-27 16:15:00] Admin Offline Orders API
export const adminOfflineOrdersApi = {
  list: (params?: { stage?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.stage) query.append('stage', params.stage);
    if (params?.search) query.append('search', params.search);
    const queryString = query.toString();
    return api<AdminOfflineOrderListResponse>(
      `/admin/offline-orders${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<{ order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}`),
  getMetrics: () => api<any>('/admin/offline-orders/metrics'),
  updateStage: (id: string, payload: { stageKey: string }) =>
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
    api(`/admin/offline-orders/${id}/production-work-order`, {
      method: 'PUT',
      body: payload,
    }),
};

export default api;
