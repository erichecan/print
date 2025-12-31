/**
 * Safe Fetch Utility
* 统一的数据获取工具，提供超时、错误处理和类型安全
 * 
 * 用途：
 * - Server Components 中的数据获取
 * - 统一的错误处理和超时控制
 * - 类型安全的响应处理
 */

export class HttpError extends Error {
  status: number;
  body?: unknown;
  url?: string;

  constructor(message: string, status: number, body?: unknown, url?: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.body = body;
    this.url = url;
  }
}

export class TimeoutError extends Error {
  url?: string;
  timeoutMs?: number;

  constructor(message: string, url?: string, timeoutMs?: number) {
    super(message);
    this.name = 'TimeoutError';
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

export class NetworkError extends Error {
  url?: string;
  originalError?: unknown;

  constructor(message: string, url?: string, originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
    this.url = url;
    this.originalError = originalError;
  }
}

export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

/**
 * 安全的数据获取函数
 * 
 * @param url - 请求 URL
 * @param options - Fetch 选项和自定义选项（timeout, retries）
 * @returns 解析后的 JSON 数据
 * 
 * @throws {TimeoutError} 请求超时
 * @throws {HttpError} HTTP 错误（4xx, 5xx）
 * @throws {NetworkError} 网络错误
 */
export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<T> {
  const {
    timeout = 10000, // 默认 10 秒超时
    retries = 0,
    retryDelay = 1000,
    ...fetchOptions
  } = options;

  let lastError: Error | null = null;

  // 重试逻辑
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // 处理非 2xx 响应
        if (!response.ok) {
          let errorBody: unknown = null;
          try {
            const text = await response.text();
            if (text) {
              try {
                errorBody = JSON.parse(text);
              } catch {
                errorBody = text;
              }
            }
          } catch {
            // 忽略解析错误
          }

          const error = new HttpError(
            `HTTP ${response.status} ${response.statusText} for ${url}`,
            response.status,
            errorBody,
            url
          );

          // 4xx 错误不重试
          if (response.status >= 400 && response.status < 500) {
            throw error;
          }

          // 5xx 错误可以重试
          if (attempt < retries) {
            console.warn(`[SafeFetch] Retrying after ${response.status} error (attempt ${attempt + 1}/${retries + 1})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            lastError = error;
            continue;
          }

          throw error;
        }

        // 处理响应体
        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          const text = await response.text();
          if (!text || text.trim() === '') {
            return {} as T;
          }
          try {
            return JSON.parse(text) as T;
          } catch (parseError) {
            throw new Error(`Invalid JSON response from ${url}: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
          }
        }

        // 非 JSON 响应
        const text = await response.text();
        return text as unknown as T;
      } catch (error: unknown) {
        clearTimeout(timeoutId);

        // 超时错误
        if (error instanceof Error && error.name === 'AbortError') {
          const timeoutError = new TimeoutError(
            `Request timeout after ${timeout}ms for ${url}`,
            url,
            timeout
          );

          // 超时可以重试
          if (attempt < retries) {
            console.warn(`[SafeFetch] Retrying after timeout (attempt ${attempt + 1}/${retries + 1})`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
            lastError = timeoutError;
            continue;
          }

          throw timeoutError;
        }

        // 其他错误
        if (error instanceof HttpError) {
          throw error;
        }

        const networkError = new NetworkError(
          `Network error for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          url,
          error
        );

        // 网络错误可以重试
        if (attempt < retries) {
          console.warn(`[SafeFetch] Retrying after network error (attempt ${attempt + 1}/${retries + 1})`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          lastError = networkError;
          continue;
        }

        throw networkError;
      }
    } catch (error: unknown) {
      // 最后一次尝试失败
      if (attempt === retries) {
        throw error;
      }
      lastError = error instanceof Error ? error : new Error('Unknown error');
    }
  }

  // 理论上不会到达这里，但 TypeScript 需要
  throw lastError || new Error('Unexpected error in safeFetch');
}

