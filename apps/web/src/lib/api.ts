/**
 * API Client
 * [2025-11-05 00:10:00]
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT'; // [2025-11-11 06:17:39] 扩展支持 PUT 请求
  body?: any;
  headers?: Record<string, string>;
}

// [2025-11-10 22:49:14] Typed checkout payment intent response to satisfy TypeScript inference
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
  }; // [2025-11-12 00:45:10] 提供费用明细用于前端展示
}

// [2025-11-10 22:50:18] Typed checkout confirm response to expose order fields
interface CheckoutConfirmResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  email: string;
}

// [2025-11-10 22:51:42] Expose cart response shape for SWR consumers
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

// [2025-11-10 22:51:42] Cart response aggregate totals
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

// [2025-11-11 23:21:12] 后台通用分页信息类型
interface AdminPagination<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// [2025-11-11 23:21:12] 后台商品类型定义
export interface AdminProductSummary {
  id: string;
  name: string;
  slug: string;
  sku: string;
  basePrice: string;
  salePrice: string;
  stockQuantity: number;
  isActive: boolean;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
  brand?: {
    id: string;
    name: string;
  } | null;
  variants?: Array<{
    id: string;
    sku: string;
    color?: string | null;
    size?: string | null;
    stockQuantity: number;
  }>;
}

export interface AdminProductDetail extends AdminProductSummary {
  description?: string | null;
  longDescription?: string | null;
  isCustomizable: boolean;
  weight?: string | null;
  dimensions?: string | null;
  unitCost: string;
  grossProfit: string;
  images?: Array<{
    id: string;
    url: string;
    alt?: string | null;
    sortOrder: number;
  }>;
  collectionProducts?: Array<{
    collection: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export interface AdminProductPayload {
  name: string;
  slug?: string;
  categoryId: string;
  brandId?: string | null;
  basePrice: number | string;
  unitCost?: number | string;
  salePrice?: number | string;
  grossProfit?: number | string;
  sku: string;
  stockQuantity?: number;
  description?: string | null;
  longDescription?: string | null;
  isActive?: boolean;
  isCustomizable?: boolean;
  weight?: number | string | null;
  dimensions?: string | null;
  variants?: Array<{
    id?: string;
    sku: string;
    color?: string | null;
    colorHex?: string | null;
    size?: string | null;
    stockQuantity?: number;
    priceAdjustment?: number | string;
    imageUrl?: string | null;
  }>;
  images?: Array<{
    id?: string;
    url: string;
    alt?: string | null;
    sortOrder?: number;
  }>;
  collections?: string[];
}

// [2025-11-11 23:21:12] 后台分类类型定义
export interface AdminCategorySummary {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  parent?: {
    id: string;
    name: string;
  } | null;
  _count?: {
    products: number;
    children: number;
  };
}

export interface AdminCategoryDetail extends AdminCategorySummary {
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
  description?: string | null;
  imageUrl?: string | null;
  parentId?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

// [2025-11-12 01:20:15] 后台订单类型定义
export interface AdminOrderSummary {
  id: string;
  orderNumber: string;
  email: string;
  status: string;
  paymentStatus: string;
  total: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  thumbnail?: string | null;
}

export interface AdminOrderDetail extends AdminOrderSummary {
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
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
  shipments: Array<{
    id: string;
    trackingNumber?: string | null;
    carrier?: string | null;
    status: string;
    labelUrl?: string | null;
    createdAt: string;
  }>;
}

export interface AdminOrderListParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  search?: string;
  email?: string;
}

export interface AdminOrderUpdatePayload {
  status?: string;
  paymentStatus?: string;
  trackingNumber?: string | null;
  carrier?: string | null;
  estimatedDelivery?: string | null;
}

export interface AdminOrderRefundPayload {
  reason?: string;
}

// [2025-11-11 15:39:42] Design Lab 数据模型定义
export interface DesignCanvasObject {
  id: string;
  type: string;
  [key: string]: any;
}

export interface DesignCanvasSnapshot {
  objects: DesignCanvasObject[];
  size?: { width: number; height: number };
  version?: string;
  background?: string | null;
  [key: string]: any;
}

export interface DesignDraft {
  id: string;
  userId?: string | null;
  sessionId?: string | null;
  productVariantId: string;
  name: string;
  status: 'DRAFT' | 'LOCKED' | 'ORDERED' | 'ARCHIVED';
  currentVersion: number;
  canvasSnapshot: DesignCanvasSnapshot;
  pricingSnapshot?: Record<string, any> | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DesignAssetUploadResponse {
  asset: {
    id: string;
    url: string;
    fileName: string;
  };
  uploadUrl: string;
}

// [2025-11-12 00:45:10] 结账地址载荷定义
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

export interface OfflineOrderStage {
  key: string;
  label: string;
  description?: string;
  position?: number;
}

export interface OfflineOrderAsset {
  id: string;
  fileName: string;
  fileSize: number;
  contentType?: string | null;
  url: string;
  uploadedAt: string;
  uploadedBy?: string | null;
}

export interface OfflineOrderHistory {
  id: string;
  fromStageKey: string | null;
  toStageKey: string;
  actorId?: string | null;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface ProductionWorkOrderEvent {
  id: string;
  status: string;
  actorId?: string | null;
  actorName?: string | null;
  note?: string | null;
  createdAt: string;
}

export interface ProductionWorkOrderSummary {
  id: string;
  workOrderCode: string;
  status: string;
  priority: number;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  assignee?: {
    id?: string | null;
    name?: string | null;
  } | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  events: ProductionWorkOrderEvent[];
}

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
  stage: {
    key: string;
    label: string;
    position?: number | null;
  };
  status: string;
  contact: {
    name: string;
    company?: string | null;
    email: string;
    phone?: string | null;
  };
  configuration?: any;
  metadata?: any;
  assets: OfflineOrderAsset[];
  createdAt: string;
  updatedAt: string;
  productionWorkOrder?: ProductionWorkOrderSummary | null;
}

export interface AdminOfflineOrderDetail extends AdminOfflineOrderSummary {
  histories: OfflineOrderHistory[];
}

export interface AdminOfflineOrderListResponse {
  orders: AdminOfflineOrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stages: OfflineOrderStage[];
}

export interface AdminOfflineOrderMetricsResponse {
  summary: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    rushActive: number;
  };
  stages: Array<OfflineOrderStage & { count: number }>;
}

export interface ProductionWorkOrderPayload {
  status?: string;
  priority?: number;
  startDate?: string | null;
  dueDate?: string | null;
  completedDate?: string | null;
  assigneeId?: string | null;
  assigneeName?: string | null;
  notes?: string | null;
  metadata?: any;
  eventNote?: string | null;
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
    credentials: 'include', // Include cookies for session management
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
    }), // [2025-11-12 00:45:10] 支持传入地址便于后端计算税费
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

// [2025-11-12 06:42:30] Order detail type for account orders API
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

// Orders API
export const ordersApi = {
  list: (page: number = 1, limit: number = 20) =>
    api(`/orders?page=${page}&limit=${limit}`),
  getById: (id: string) => api<AccountOrderDetail>(`/orders/${id}`), // [2025-11-12 06:42:30] Add type parameter for order detail
  getByOrderNumber: (orderNumber: string, email: string) =>
    api<AccountOrderDetail>(`/orders/number/${orderNumber}?email=${encodeURIComponent(email)}`), // [2025-11-12 06:42:30] Add type parameter
  downloadInvoice: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/orders/${id}/invoice`, {
      method: 'GET',
      credentials: 'include',
    }); // [2025-11-12 01:08:45] 下载登录用户订单发票 PDF
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
    ); // [2025-11-12 01:08:45] 下载访客订单发票 PDF
    if (!response.ok) {
      throw new Error('Failed to download invoice');
    }
    return response.blob();
  },
};

// [2025-11-12 06:32:00] User profile type for auth API responses
export interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api('/auth/register', { method: 'POST', body: data }),
  login: (email: string, password: string) =>
    api('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  me: () => api<UserProfile>('/auth/me'), // [2025-11-12 06:32:00] Add type parameter for user profile
  updateProfile: (data: { firstName?: string; lastName?: string; phone?: string }) =>
    api('/auth/me', { method: 'PATCH', body: data }),
  forgotPassword: (email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

// Address API
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

export const addressesApi = {
  list: () => api<Address[]>('/addresses'),
  get: (id: string) => api<Address>(`/addresses/${id}`),
  create: (data: AddressPayload) => api<Address>('/addresses', { method: 'POST', body: data }),
  update: (id: string, data: Partial<AddressPayload>) =>
    api<Address>(`/addresses/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => api(`/addresses/${id}`, { method: 'DELETE' }),
  setDefault: (id: string) => api<Address>(`/addresses/${id}/set-default`, { method: 'POST' }),
};

// [2025-11-11 23:21:12] 后台商品 API
// Image Upload API
export const imageUploadApi = {
  upload: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    return api('/admin/upload/image', {
      method: 'POST',
      body: formData,
    });
  },
};

export const adminProductsApi = {
  list: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive';
    categoryId?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.categoryId) query.append('categoryId', params.categoryId);
    const queryString = query.toString();
    return api<AdminPagination<AdminProductSummary>>(
      `/admin/products${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminProductDetail>(`/admin/products/${id}`),
  create: (payload: AdminProductPayload) =>
    api<AdminProductDetail>('/admin/products', {
      method: 'POST',
      body: payload,
    }),
  update: (id: string, payload: Partial<AdminProductPayload>) =>
    api<AdminProductDetail>(`/admin/products/${id}`, {
      method: 'PUT',
      body: payload,
    }),
  archive: (id: string) =>
    api<{ success: boolean }>(`/admin/products/${id}`, { method: 'DELETE' }),
  updateStatus: (id: string, isActive: boolean) =>
    api(`/admin/products/${id}/status`, {
      method: 'PATCH',
      body: { isActive },
    }),
};

// [2025-11-11 23:21:12] 后台分类 API
export const adminCategoriesApi = {
  list: (params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive';
    parentId?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.search) query.append('search', params.search);
    if (params.status) query.append('status', params.status);
    if (params.parentId) query.append('parentId', params.parentId);
    const queryString = query.toString();
    return api<AdminPagination<AdminCategorySummary>>(
      `/admin/categories${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminCategoryDetail>(`/admin/categories/${id}`),
  create: (payload: AdminCategoryPayload) =>
    api<AdminCategoryDetail>('/admin/categories', {
      method: 'POST',
      body: payload,
    }),
  update: (id: string, payload: Partial<AdminCategoryPayload>) =>
    api<AdminCategoryDetail>(`/admin/categories/${id}`, {
      method: 'PUT',
      body: payload,
    }),
  archive: (id: string) =>
    api<{ success: boolean }>(`/admin/categories/${id}`, { method: 'DELETE' }),
};

export const adminOrdersApi = {
  list: (params: AdminOrderListParams = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.status) query.append('status', params.status);
    if (params.paymentStatus) query.append('paymentStatus', params.paymentStatus);
    if (params.search) query.append('search', params.search);
    if (params.email) query.append('email', params.email);
    const queryString = query.toString();
    return api<AdminPagination<AdminOrderSummary>>(
      `/admin/orders${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<AdminOrderDetail>(`/admin/orders/${id}`),
  updateStatus: (id: string, payload: AdminOrderUpdatePayload) =>
    api<AdminOrderDetail>(`/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: payload,
    }),
  recordRefund: (id: string, payload: AdminOrderRefundPayload = {}) =>
    api<AdminOrderDetail>(`/admin/orders/${id}/refund`, {
      method: 'POST',
      body: payload,
    }),
};

// Offline Orders API (Public)
export interface OfflineOrderPayload {
  projectName: string;
  primaryProduct?: string;
  quantity?: number;
  deliveryDate?: string;
  artworkNotes?: string;
  company?: string;
  contactName: string;
  email: string;
  phone?: string;
  requiresMockups?: boolean;
  requiresProof?: boolean;
  rushOrder?: boolean;
  configuration?: Record<string, unknown>;
}

export interface OfflineOrderResponse {
  success: boolean;
  order: {
    id: string;
    orderCode: string;
    projectName: string;
    email: string;
    status: string;
    createdAt: string;
  };
}

export const offlineOrdersApi = {
  create: async (payload: OfflineOrderPayload, files?: File[]): Promise<OfflineOrderResponse> => {
    const formData = new FormData();
    
    // Append form fields
    Object.entries(payload).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (typeof value === 'boolean') {
          formData.append(key, value.toString());
        } else if (typeof value === 'object') {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });
    
    // Append files
    if (files && files.length > 0) {
      files.forEach((file) => {
        formData.append('assets', file);
      });
    }
    
    return api('/offline-orders', {
      method: 'POST',
      body: formData,
    });
  },
};

export const adminOfflineOrdersApi = {
  list: (params: {
    page?: number;
    limit?: number;
    stageKey?: string;
    status?: string;
    rush?: boolean;
    search?: string;
  } = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.stageKey) query.append('stageKey', params.stageKey);
    if (params.status) query.append('status', params.status);
    if (typeof params.rush === 'boolean') query.append('rush', params.rush.toString());
    if (params.search) query.append('search', params.search);
    const queryString = query.toString();
    return api<AdminOfflineOrderListResponse>(
      `/admin/offline-orders${queryString ? `?${queryString}` : ''}`
    );
  },
  get: (id: string) => api<{ success: boolean; order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}`),
  updateStage: (id: string, payload: { stageKey: string; note?: string; position?: number | null }) =>
    api<{ success: boolean; order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}/stage`, {
      method: 'PATCH',
      body: payload,
    }),
  update: (id: string, payload: Record<string, unknown>) =>
    api<{ success: boolean; order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  addNote: (id: string, note: string) =>
    api<{ success: boolean; order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}/notes`, {
      method: 'POST',
      body: { note },
    }),
  uploadAssets: (id: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('assets', file));
    return api<{ success: boolean; order: AdminOfflineOrderDetail }>(
      `/admin/offline-orders/${id}/assets`,
      { method: 'POST', body: formData }
    );
  },
  upsertProductionWorkOrder: (id: string, payload: ProductionWorkOrderPayload) =>
    api<{ success: boolean; order: AdminOfflineOrderDetail }>(`/admin/offline-orders/${id}/production`, {
      method: 'POST',
      body: payload,
    }),
  getStages: () => api<{ success: boolean; stages: OfflineOrderStage[] }>(`/admin/offline-orders/config/stages`),
  updateStages: (stages: OfflineOrderStage[]) =>
    api<{ success: boolean; stages: OfflineOrderStage[] }>(`/admin/offline-orders/config/stages`, {
      method: 'PUT',
      body: { stages },
    }),
  getMetrics: () =>
    api<AdminOfflineOrderMetricsResponse>(`/admin/offline-orders/metrics/summary`),
};

// Admin Audit Logs API
export interface AdminAuditLog {
  id: string;
  action: string;
  actorId: string | null;
  actorEmail: string | null;
  targetType: string;
  targetId: string | null;
  meta: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export interface AdminAuditLogListParams {
  page?: number;
  limit?: number;
  targetType?: string;
  targetId?: string;
  action?: string;
}

export const adminAuditLogsApi = {
  list: (params: AdminAuditLogListParams = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', params.page.toString());
    if (params.limit) query.append('limit', params.limit.toString());
    if (params.targetType) query.append('targetType', params.targetType);
    if (params.targetId) query.append('targetId', params.targetId);
    if (params.action) query.append('action', params.action);
    const queryString = query.toString();
    return api<AdminPagination<AdminAuditLog>>(
      `/admin/audit-logs${queryString ? `?${queryString}` : ''}`
    );
  },
};

// [2025-11-11 15:39:42] Design Lab API
export const designLabApi = {
  createDraft: (payload: { productVariantId: string; name?: string; canvas?: DesignCanvasSnapshot; pricing?: Record<string, any> | null }) =>
    api<{ data: DesignDraft; meta: { sessionId?: string | null } }>('/designs', {
      method: 'POST',
      body: payload,
    }),
  getDraft: (id: string) => api<{ data: DesignDraft }>(`/designs/${id}`),
  updateDraft: (id: string, payload: Partial<{ name: string; canvas: DesignCanvasSnapshot; pricing: Record<string, any> | null; thumbnailUrl: string | null; summary: string }>) =>
    api<{ data: DesignDraft }>(`/designs/${id}`, {
      method: 'PATCH',
      body: payload,
    }),
  requestQuote: (id: string, quantity: number) =>
    api<{ data: { unitPrice: number; quantity: number; total: number; currency: string } }>(`/designs/${id}/quote`, {
      method: 'POST',
      body: { quantity },
    }),
  submitOrder: (id: string, payload: { quantity: number; notes?: string }) =>
    api<{ data: { design: DesignDraft; orderDraft: { designId: string; quantity: number; notes?: string | null } } }>(`/designs/${id}/order`, {
      method: 'POST',
      body: payload,
    }),
  generateAssetUpload: (id: string, payload: { fileName: string; fileSize: number; contentType: string }) =>
    api<{ data: DesignAssetUploadResponse }>(`/designs/${id}/assets`, {
      method: 'POST',
      body: payload,
    }),
};

export default api;
