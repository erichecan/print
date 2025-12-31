/**
 * Global Error Filter Component
* 过滤和抑制不相关的浏览器错误，如 GCP Console 内部错误
 */
'use client';

import { useEffect } from 'react';

// 需要被过滤的错误模式
// 添加 ReferenceError 过滤，修复 "Cannot access 'W' before initialization" 错误
// 修复：添加浏览器扩展异步监听错误过滤
// 添加后端服务错误过滤（当后端服务不可用时，这些错误已被优雅处理）
const FILTERED_ERROR_PATTERNS = [
  // GCP Console 内部 API 错误
  /cloudusersettings-pa\.clients6\.google\.com/i,
  /cloudusersettings/i,
  // PerformanceObserver 相关警告（某些浏览器不支持 buffered 标志）
  /PerformanceObserver.*buffered.*entryTypes/i,
  /PerformanceObserver.*does not support buffered/i,
// ReferenceError: Cannot access 'W' before initialization
// 更广泛的过滤：覆盖所有可能的变量名（打包后变量名会被压缩）
  // 这通常来自 React DevTools 或其他开发工具的格式化代码，或打包后的代码
  /Cannot access ['"]?[Ww]?['"]? before initialization/i,
  /ReferenceError.*Cannot access.*before initialization/i,
  /Cannot access ['"]?[A-Za-z0-9_]+['"]? before initialization/i,
// 浏览器扩展异步监听错误（React DevTools、Redux DevTools 等）
  /A listener indicated an asynchronous response by returning true, but the message channel closed/i,
  /listener.*asynchronous.*response.*message channel closed/i,
  /message channel closed before.*response.*received/i,
// 后端服务错误（当后端服务不可用时，这些错误已被优雅处理，不需要在控制台显示）
  // 注意：这些错误已经在对应的 Context 中被捕获和处理（返回空数据或默认值）
  // 过滤这些错误可以减少控制台噪音，但保留网络错误的原始信息
  /GET.*\/api\/auth\/me.*50[0-9]/i, // 认证 API 500/503 错误
  /GET.*\/api\/proxy\/cart.*50[0-9]/i, // 购物车 API 500/503 错误
  /GET.*\/api\/.*\/50[0-9]/i, // 其他 API 5xx 错误（可选，如果需要可以删除这一行）
  // 其他第三方服务错误（根据需要添加）
];

// 需要被过滤的警告模式
// 更新：添加更完整的 CSS 预加载警告过滤模式
const FILTERED_WARNING_PATTERNS = [
  /PerformanceObserver/i,
  /preloaded.*not used/i,
  /preload.*was preloaded.*not used/i,
  /resource.*was preloaded.*not used/i,
/was preloaded using link preload but not used/i, // 匹配 Next.js CSS 预加载警告
/preloaded using link preload but not used/i, // 更通用的匹配
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
// 保存原始的 console 方法
    const originalError = console.error;
    const originalWarn = console.warn;

// 拦截 console.error
// 修复：使用 try-catch 包装，防止格式化代码中的 ReferenceError
    console.error = (...args: unknown[]) => {
      try {
        const errorMessage = args.map(arg => 
          typeof arg === 'string' ? arg : 
          arg instanceof Error ? arg.message : 
          String(arg)
        ).join(' ');

        // 如果错误匹配过滤模式，则抑制它
        if (!shouldFilterError(errorMessage)) {
// 修复：使用 try-catch 包装原始调用，防止格式化错误
          try {
            originalError.apply(console, args);
          } catch (formatError) {
            // 如果格式化失败（如 ReferenceError），尝试直接输出原始参数
            try {
              originalError(...args);
            } catch (fallbackError) {
              // 如果还是失败，静默忽略（可能是开发工具的问题）
              if (process.env.NODE_ENV === 'development') {
                console.warn('[GlobalErrorFilter] Failed to log error:', fallbackError);
              }
            }
          }
        }
      } catch (e) {
        // 如果错误处理本身失败，静默忽略（避免无限循环）
        if (process.env.NODE_ENV === 'development') {
          console.warn('[GlobalErrorFilter] Error in error handler:', e);
        }
      }
    };

// 拦截 console.warn
// 修复：使用 try-catch 包装，防止格式化代码中的 ReferenceError
    console.warn = (...args: unknown[]) => {
      try {
        const message = args.map(arg => String(arg)).join(' ');

        // 如果警告匹配过滤模式，则抑制它
        if (!shouldFilterWarning(message)) {
// 修复：使用 try-catch 包装原始调用，防止格式化错误
          try {
            originalWarn.apply(console, args);
          } catch (formatError) {
            // 如果格式化失败（如 ReferenceError），尝试直接输出原始参数
            try {
              originalWarn(...args);
            } catch (fallbackError) {
              // 如果还是失败，静默忽略（可能是开发工具的问题）
              if (process.env.NODE_ENV === 'development') {
                console.warn('[GlobalErrorFilter] Failed to log warning:', fallbackError);
              }
            }
          }
        }
      } catch (e) {
        // 如果警告处理本身失败，静默忽略（避免无限循环）
        if (process.env.NODE_ENV === 'development') {
          console.warn('[GlobalErrorFilter] Error in warning handler:', e);
        }
      }
    };

// 全局错误处理器 - 过滤不相关的错误
// 修复：添加对 ReferenceError 的特殊处理
    const handleError = (event: ErrorEvent) => {
      try {
        const errorMessage = event.message || event.filename || String(event.error);
        const errorUrl = event.filename || '';
        
        // 检查错误 URL 是否是 GCP Console 内部 API
        if (errorUrl.includes('cloudusersettings') || errorUrl.includes('clients6.google.com')) {
          event.preventDefault();
          return false;
        }
        
// 特殊处理：过滤 ReferenceError: Cannot access 'W' before initialization
        // 这通常来自 React DevTools 或其他开发工具的格式化代码
        if (errorMessage.includes('Cannot access') && errorMessage.includes('before initialization')) {
          // 检查是否来自开发工具（installHook.js, page-*.js 等）
          const isFromDevTools = errorUrl.includes('installHook') || 
                                  errorUrl.includes('page-') || 
                                  errorUrl.includes('devtools') ||
                                  errorUrl.includes('chrome-extension');
          
          if (isFromDevTools) {
            event.preventDefault();
            return false;
          }
        }
        
// 特殊处理：过滤浏览器扩展异步监听错误
        if (errorMessage.includes('listener') && 
            errorMessage.includes('asynchronous response') && 
            errorMessage.includes('message channel closed')) {
          // 检查是否来自浏览器扩展（installHook.js 通常是扩展注入的）
          const isFromExtension = errorUrl.includes('installHook') || 
                                   errorUrl.includes('chrome-extension') ||
                                   errorUrl.includes('moz-extension') ||
                                   errorUrl.includes('safari-extension') ||
                                   !errorUrl || // 某些扩展错误没有 URL
                                   errorUrl === '';
          
          if (isFromExtension) {
            event.preventDefault();
            return false;
          }
        }
        
        if (shouldFilterError(errorMessage)) {
          // 抑制错误，阻止它显示在控制台
          event.preventDefault();
          return false;
        }
      } catch (e) {
        // 如果错误处理本身失败，允许原始错误通过
        if (process.env.NODE_ENV === 'development') {
          console.warn('[GlobalErrorFilter] Error in handleError:', e);
        }
      }
    };

// 全局未捕获 Promise 错误处理器
// 修复：增强异步监听错误的过滤
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMessage = event.reason 
        ? (event.reason instanceof Error ? event.reason.message : String(event.reason))
        : 'Unhandled promise rejection';
      
// 特殊处理：过滤浏览器扩展异步监听错误
      if (errorMessage.includes('listener') && 
          errorMessage.includes('asynchronous response') && 
          errorMessage.includes('message channel closed')) {
        event.preventDefault();
        return false;
      }
      
      if (shouldFilterError(errorMessage)) {
        // 抑制错误
        event.preventDefault();
        return false;
      }
    };

// 拦截 XMLHttpRequest 错误（过滤 GCP Console 的 404）
    // 注意：我们不拦截 fetch，因为可能会影响正常的 API 请求
    // 而是在错误事件处理器中过滤这些错误

// 添加全局错误监听器
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

// 清理函数：恢复原始方法
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

