/**
 * Unified API Client
 * [2025-12-09] 统一 API 请求客户端，禁止硬编码 URL
 * 所有 API 请求必须通过此客户端，确保环境变量正确使用
 * [2025-12-09] 修复：使用统一的环境变量配置模块
 */

import { getFrontendApiBaseUrl } from '@/config/env';

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
    credentials = 'include',
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
      // [2025-12-10] 分类处理错误状态码
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
      
      // [2025-12-10] 结构化错误对象
      const apiError = {
        status: response.status,
        statusText: response.statusText,
        message: errorData?.message || errorData?.error || `API request failed: ${response.status} ${response.statusText}`,
        data: errorData,
        url,
        method,
      };
      
      console.error('[API Client] Request failed:', apiError);
      
      // [2025-12-10] 根据状态码抛出不同类型的错误
      if (response.status === 401) {
        const error = new Error('Unauthorized') as any;
        error.code = 'UNAUTHORIZED';
        error.status = 401;
        error.data = errorData;
        throw error;
      } else if (response.status === 403) {
        const error = new Error('Forbidden') as any;
        error.code = 'FORBIDDEN';
        error.status = 403;
        error.data = errorData;
        throw error;
      } else if (response.status === 404) {
        const error = new Error('Not Found') as any;
        error.code = 'NOT_FOUND';
        error.status = 404;
        error.data = errorData;
        throw error;
      } else if (response.status >= 500) {
        const error = new Error('Server Error') as any;
        error.code = 'SERVER_ERROR';
        error.status = response.status;
        error.data = errorData;
        throw error;
      } else {
        const error = new Error(apiError.message) as any;
        error.code = 'CLIENT_ERROR';
        error.status = response.status;
        error.data = errorData;
        throw error;
      }
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      return await response.json() as T;
    } else {
      return await response.text() as T;
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    
    console.error('[API Client] Request error:', {
      url,
      method,
      error: error?.message || 'Unknown error',
    });
    throw error;
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

