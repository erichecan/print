/**
 * Global Error Filter Component
 * [2025-01-29 01:00:00] 过滤和抑制不相关的浏览器错误，如 GCP Console 内部错误
 */
'use client';

import { useEffect } from 'react';

// [2025-01-29 01:00:00] 需要被过滤的错误模式
const FILTERED_ERROR_PATTERNS = [
  // GCP Console 内部 API 错误
  /cloudusersettings-pa\.clients6\.google\.com/i,
  /cloudusersettings/i,
  // PerformanceObserver 相关警告（某些浏览器不支持 buffered 标志）
  /PerformanceObserver.*buffered.*entryTypes/i,
  /PerformanceObserver.*does not support buffered/i,
  // 其他第三方服务错误（根据需要添加）
];

// [2025-01-29 01:00:00] 需要被过滤的警告模式
const FILTERED_WARNING_PATTERNS = [
  /PerformanceObserver/i,
  /preloaded.*not used/i,
  /preload.*was preloaded.*not used/i,
  /resource.*was preloaded.*not used/i,
];

/**
 * 检查错误是否应该被过滤
 */
function shouldFilterError(error: string | Error | Event): boolean {
  const errorMessage = typeof error === 'string' 
    ? error 
    : error instanceof Error 
    ? error.message 
    : error.type || String(error);
    
  return FILTERED_ERROR_PATTERNS.some(pattern => pattern.test(errorMessage));
}

/**
 * 检查警告是否应该被过滤
 */
function shouldFilterWarning(message: string): boolean {
  return FILTERED_WARNING_PATTERNS.some(pattern => pattern.test(message));
}

/**
 * 全局错误过滤组件
 * 在应用启动时设置全局错误和警告过滤器
 */
export function GlobalErrorFilter() {
  useEffect(() => {
    // [2025-01-29 01:00:00] 保存原始的 console 方法
    const originalError = console.error;
    const originalWarn = console.warn;

    // [2025-01-29 01:00:00] 拦截 console.error
    console.error = (...args: unknown[]) => {
      const errorMessage = args.map(arg => 
        typeof arg === 'string' ? arg : 
        arg instanceof Error ? arg.message : 
        String(arg)
      ).join(' ');

      // 如果错误匹配过滤模式，则抑制它
      if (!shouldFilterError(errorMessage)) {
        originalError.apply(console, args);
      }
    };

    // [2025-01-29 01:00:00] 拦截 console.warn
    console.warn = (...args: unknown[]) => {
      const message = args.map(arg => String(arg)).join(' ');

      // 如果警告匹配过滤模式，则抑制它
      if (!shouldFilterWarning(message)) {
        originalWarn.apply(console, args);
      }
    };

    // [2025-01-29 01:00:00] 全局错误处理器 - 过滤不相关的错误
    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || event.filename || String(event.error);
      const errorUrl = event.filename || '';
      
      // 检查错误 URL 是否是 GCP Console 内部 API
      if (errorUrl.includes('cloudusersettings') || errorUrl.includes('clients6.google.com')) {
        event.preventDefault();
        return false;
      }
      
      if (shouldFilterError(errorMessage)) {
        // 抑制错误，阻止它显示在控制台
        event.preventDefault();
        return false;
      }
    };

    // [2025-01-29 01:00:00] 全局未捕获 Promise 错误处理器
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason 
        ? (event.reason instanceof Error ? event.reason.message : String(event.reason))
        : 'Unhandled promise rejection';
      
      if (shouldFilterError(errorMessage)) {
        // 抑制错误
        event.preventDefault();
        return false;
      }
    };

    // [2025-01-29 01:05:00] 拦截 XMLHttpRequest 错误（过滤 GCP Console 的 404）
    // 注意：我们不拦截 fetch，因为可能会影响正常的 API 请求
    // 而是在错误事件处理器中过滤这些错误

    // [2025-01-29 01:00:00] 添加全局错误监听器
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // [2025-01-29 01:00:00] 清理函数：恢复原始方法
    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // 这个组件不渲染任何内容
  return null;
}

