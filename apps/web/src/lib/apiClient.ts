/**
 * Unified API Client
 * [2025-01-30 23:00:00] Design Lab 4.0: 统一错误分类，浏览器端 credentials: 'include'
 * 所有 API 请求必须通过此客户端，确保环境变量正确使用
 */

import { getFrontendApiBaseUrl } from '@/config/env';

/**
 * API 错误分类
 * [2025-01-30 23:00:00] Design Lab 4.0: 统一错误分类，便于错误处理
 */
export enum ApiErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN = 'UNKNOWN',
}

export class ApiError extends Error {
  constructor(
    public type: ApiErrorType,
    message: string,
    public statusCode?: number,
    public originalError?: Error,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 构建完整的 API URL
 * [2025-12-09] 支持相对路径和绝对路径
 */
function buildApiUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
  // [2025-12-09] 修复：使用统一的环境变量配置，在运行时获取
  const apiBase = getFrontendApiBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  if (apiBase.startsWith('http://') || apiBase.startsWith('https://')) {
    // 绝对 URL：使用 new URL
    const url = new URL(cleanPath, apiBase);
    if (params) {
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .forEach(([key, value]) => {
          url.searchParams.set(key, String(value));
        });
    }
    return url.toString();
  } else {
    // 相对路径：直接拼接
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .forEach(([key, value]) => {
          searchParams.set(key, String(value));
        });
    }
    const queryString = searchParams.toString();
    return `${apiBase}${cleanPath}${queryString ? `?${queryString}` : ''}`;
  }
}

/**
 * 统一的 fetch 封装
 * [2025-12-09] 提供统一的错误处理和超时控制
 */
export async function apiClient<T = any>(
  path: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    body?: any;
    params?: Record<string, string | number | boolean | undefined>;
    headers?: Record<string, string>;
    timeout?: number;
    credentials?: RequestCredentials;
  } = {}
): Promise<T> {
  const {
    method = 'GET',
    body,
    params,
    headers = {},
    timeout = 10000,
    credentials = 'include', // [2025-01-30 23:00:00] Design Lab 4.0: 浏览器端默认 'include'
  } = options;

  const url = buildApiUrl(path, params);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      credentials,
      signal: controller.signal,
    };

    if (body && method !== 'GET') {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);

    if (!response.ok) {
      // [2025-01-30 23:00:00] Design Lab 4.0: 统一错误分类
      const contentType = response.headers.get('content-type');
      let errorData: any = null;
      
      try {
        if (contentType?.includes('application/json')) {
          errorData = await response.json();
        } else {
          const errorText = await response.text();
          // 如果返回的是 HTML（可能是错误页面），不解析为 JSON
          if (errorText.trim().startsWith('<!')) {
            errorData = { message: `HTTP ${response.status} ${response.statusText}` };
          } else {
            errorData = { message: errorText.substring(0, 200) };
          }
        }
      } catch (parseError) {
        errorData = { message: `HTTP ${response.status} ${response.statusText}` };
      }
      
      // [2025-01-30 23:00:00] Design Lab 4.0: 统一错误分类
      let errorType: ApiErrorType;
      if (response.status === 401) {
        errorType = ApiErrorType.UNAUTHORIZED;
      } else if (response.status === 403) {
        errorType = ApiErrorType.FORBIDDEN;
      } else if (response.status === 404) {
        errorType = ApiErrorType.NOT_FOUND;
      } else if (response.status >= 500) {
        errorType = ApiErrorType.SERVER_ERROR;
      } else if (response.status >= 400) {
        errorType = ApiErrorType.CLIENT_ERROR;
      } else {
        errorType = ApiErrorType.UNKNOWN;
      }
      
      const errorMessage = errorData?.message || errorData?.error || `API request failed: ${response.status} ${response.statusText}`;
      
      console.error('[API Client] Request failed:', {
        url,
        method,
        status: response.status,
        statusText: response.statusText,
        errorType,
        error: errorMessage.substring(0, 200),
      });
      
      throw new ApiError(
        errorType,
        errorMessage,
        response.status,
        new Error(errorMessage),
        errorData
      );
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json() as T;
    } else {
      return await response.text() as T;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    // [2025-01-30 23:00:00] Design Lab 4.0: 网络错误分类
    if (error.name === 'AbortError') {
      throw new ApiError(
        ApiErrorType.TIMEOUT,
        `Request timeout after ${timeout}ms`,
        undefined,
        error
      );
    }
    
    // [2025-01-30 23:00:00] Design Lab 4.0: 网络错误分类
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new ApiError(
        ApiErrorType.NETWORK_ERROR,
        'Network error: Failed to fetch',
        undefined,
        error
      );
    }
    
    console.error('[API Client] Request error:', {
      url,
      method,
      error: error?.message || 'Unknown error',
    });
    
    throw new ApiError(
      ApiErrorType.UNKNOWN,
      error?.message || 'Unknown error',
      undefined,
      error
    );
  }
}

/**
 * GET 请求
 */
export function apiGet<T = any>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: { timeout?: number; credentials?: RequestCredentials }
): Promise<T> {
  return apiClient<T>(path, {
    method: 'GET',
    params,
    timeout: options?.timeout,
    credentials: options?.credentials,
  });
}

/**
 * POST 请求
 */
export function apiPost<T = any>(
  path: string,
  body?: any,
  options?: { params?: Record<string, string | number | boolean | undefined>; timeout?: number; credentials?: RequestCredentials }
): Promise<T> {
  return apiClient<T>(path, {
    method: 'POST',
    body,
    params: options?.params,
    timeout: options?.timeout,
    credentials: options?.credentials,
  });
}

/**
 * PUT 请求
 */
export function apiPut<T = any>(
  path: string,
  body?: any,
  options?: { params?: Record<string, string | number | boolean | undefined>; timeout?: number; credentials?: RequestCredentials }
): Promise<T> {
  return apiClient<T>(path, {
    method: 'PUT',
    body,
    params: options?.params,
    timeout: options?.timeout,
    credentials: options?.credentials,
  });
}

/**
 * PATCH 请求
 */
export function apiPatch<T = any>(
  path: string,
  body?: any,
  options?: { params?: Record<string, string | number | boolean | undefined>; timeout?: number; credentials?: RequestCredentials }
): Promise<T> {
  return apiClient<T>(path, {
    method: 'PATCH',
    body,
    params: options?.params,
    timeout: options?.timeout,
    credentials: options?.credentials,
  });
}

/**
 * DELETE 请求
 */
export function apiDelete<T = any>(
  path: string,
  options?: { params?: Record<string, string | number | boolean | undefined>; timeout?: number; credentials?: RequestCredentials }
): Promise<T> {
  return apiClient<T>(path, {
    method: 'DELETE',
    params: options?.params,
    timeout: options?.timeout,
    credentials: options?.credentials,
  });
}

