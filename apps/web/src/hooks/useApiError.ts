/**
 * API Error Handling Hook
* 统一 API 错误处理 Hook，提供错误提示和重试机制
 */
import { useState, useCallback } from 'react';

export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  retryable?: boolean;
}

export function useApiError() {
  const [error, setError] = useState<ApiError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const handleError = useCallback((err: unknown): ApiError => {
    let apiError: ApiError;

    if (err instanceof Error) {
      // 检查是否是网络错误
      const isNetworkError = err.message.includes('network') ||
        err.message.includes('timeout') ||
        err.message.includes('Failed to fetch');

      const status = (err as any).statusCode || (err as any).status;
      const isRetryableStatus = status === 429 || status === 503 || status === 502 || status === 504 || status >= 500;

      apiError = {
        message: err.message,
        status,
        code: (err as any).category || (err as any).code,
        retryable: isNetworkError || isRetryableStatus,
      };
    } else if (typeof err === 'object' && err !== null) {
      const errorObj = err as Record<string, unknown>;
      const status = errorObj.status as number || errorObj.statusCode as number;
      apiError = {
        message: (errorObj.message as string) || 'An unexpected error occurred',
        code: errorObj.code as string,
        status,
        retryable: status === 429 || status === 503 || status === 502 || status === 504 || status >= 500 || status === 408,
      };
    } else {
      apiError = {
        message: 'An unexpected error occurred',
        retryable: false,
      };
    }

    setError(apiError);
    return apiError;
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(async <T,>(fn: () => Promise<T>, maxRetries = 3): Promise<T> => {
    setIsRetrying(true);
    clearError();

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        setIsRetrying(false);
        return result;
      } catch (err) {
        lastError = err;
        if (attempt < maxRetries) {
          // 指数退避：等待时间 = 2^attempt * 1000ms
          await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    setIsRetrying(false);
    handleError(lastError);
    throw lastError;
  }, [clearError, handleError]);

  return {
    error,
    isRetrying,
    handleError,
    clearError,
    retry,
  };
}

