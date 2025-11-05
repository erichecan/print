/**
 * API Client
 * [2025-11-05 00:10:00]
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

async function api<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  const config: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    credentials: 'include', // Include cookies for session management
  };

  if (body && method !== 'GET') {
    config.body = JSON.stringify(body);
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
};

// Collections API
export const collectionsApi = {
  list: () => api('/collections'),
  getBySlug: (slug: string) => api(`/collections/${slug}`),
};

// Cart API
export const cartApi = {
  get: () => api('/cart'),
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
  prepare: () => api('/checkout/prepare', { method: 'POST' }),
  getShippingRates: (address: any) =>
    api('/checkout/shipping-rates', { method: 'POST', body: { address } }),
  createPaymentIntent: (shippingAddress: any, shippingMethod: string = 'standard') =>
    api('/checkout/create-payment-intent', {
      method: 'POST',
      body: { shippingAddress, shippingMethod },
    }),
  confirm: (paymentIntentId: string, shippingAddress: any, billingAddress: any, shippingMethod: string, email: string) =>
    api('/checkout/confirm', {
      method: 'POST',
      body: { paymentIntentId, shippingAddress, billingAddress, shippingMethod, email },
    }),
};

// Orders API
export const ordersApi = {
  list: (page: number = 1, limit: number = 20) =>
    api(`/orders?page=${page}&limit=${limit}`),
  getById: (id: string) => api(`/orders/${id}`),
  getByOrderNumber: (orderNumber: string, email: string) =>
    api(`/orders/number/${orderNumber}?email=${encodeURIComponent(email)}`),
};

// Auth API
export const authApi = {
  register: (data: { email: string; password: string; firstName?: string; lastName?: string }) =>
    api('/auth/register', { method: 'POST', body: data }),
  login: (email: string, password: string) =>
    api('/auth/login', { method: 'POST', body: { email, password } }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  me: () => api('/auth/me'),
  forgotPassword: (email: string) =>
    api('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    api('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

export default api;
