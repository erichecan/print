/**
 * API Configuration
* 集中管理 API 配置，确保正确使用环境变量
* 修复：使用统一的环境变量配置模块
 * 
 * @deprecated 请使用 @/config/env 中的 getFrontendApiBaseUrl()
 * 保留此文件以保持向后兼容
 */

import { getFrontendApiBaseUrl } from '@/config/env';

/**
 * 获取 API 基础 URL
* 修复：委托给统一的环境变量配置模块
 * 
 * @deprecated 请直接使用 getFrontendApiBaseUrl() from @/config/env
 */
function getApiBaseUrl(): string {
  return getFrontendApiBaseUrl();
}

// 保留旧的 normalizeApiUrl 函数以保持向后兼容（但不再使用）
function normalizeApiUrl(base: string): string {
  const clean = base.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}


// 修复：延迟计算 API_BASE_URL，避免在模块顶层执行时出现问题
// 在服务端组件中使用时，确保正确获取环境变量
let cachedApiBaseUrl: string | null = null;

export function getApiBaseUrlValue(): string {
  if (cachedApiBaseUrl === null) {
    cachedApiBaseUrl = getApiBaseUrl();
  }
  return cachedApiBaseUrl;
}

// 保持向后兼容，但使用函数获取值
// 注意：在服务端组件中，建议使用 getApiBaseUrlValue() 而不是直接使用 API_BASE_URL
export const API_BASE_URL = getApiBaseUrlValue();

// 配置检查和日志输出（仅在浏览器环境）
// 修复：使用统一的环境变量配置，移除强制回退逻辑
if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // 开发环境：输出配置信息用于调试
    console.log('[API Config] API_BASE_URL:', API_BASE_URL);
    console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  } else {
// 生产环境：检查是否使用了 localhost（配置错误）
    // 如果检测到 localhost，说明环境变量未正确设置，应该抛出错误而不是强制回退
    if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
      console.error('[API Config] ❌ 错误：生产环境检测到 localhost API 地址！');
      console.error('[API Config] 当前 API_BASE_URL:', API_BASE_URL);
      console.error('[API Config] 环境变量检查:', {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '未设置',
        API_BASE_URL: process.env.API_BASE_URL || '未设置',
        NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || '未设置',
      });
// 生产环境不允许 localhost，应该配置正确的环境变量
      // 不再强制回退到 /api，而是抛出错误（由统一配置模块处理）
      console.error('[API Config] ⚠️ 请设置正确的 NEXT_PUBLIC_API_URL 环境变量');
    }
  }
}

