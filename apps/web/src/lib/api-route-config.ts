/**
 * API Route Configuration
 * [2025-01-29 23:25:00] 统一管理 Next.js API 路由的后端 URL 配置
 * [2025-12-09] 修复：移除硬编码地址，统一使用环境变量
 */

// [2025-01-29 12:30:00] 开发环境默认 API 地址
const DEFAULT_API_BASE_DEV = 'http://localhost:3001/api';

/**
 * 获取后端 API 基础 URL
 * [2025-01-29 23:25:00] 优先使用环境变量，确保生产环境正确配置
 * [2025-12-09] 修复：移除硬编码地址，统一从环境变量读取
 */
export function getBackendApiBase(): string {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // [2025-12-09] 优先使用 NEXT_PUBLIC_API_URL（前端环境变量）
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicApiUrl) {
    // 生产环境不允许 localhost
    if (!isDevelopment && (publicApiUrl.includes('localhost') || publicApiUrl.includes('127.0.0.1'))) {
      console.error('[API Route Config] ❌ 错误：生产环境检测到 localhost API 地址！', publicApiUrl);
      console.error('[API Route Config] 请设置 NEXT_PUBLIC_API_URL 环境变量指向正确的生产环境 API 服务器');
      throw new Error('生产环境 API 配置错误：检测到 localhost 地址。请设置 NEXT_PUBLIC_API_URL 环境变量。');
    }
    const url = publicApiUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 API_BASE_URL（服务器端环境变量）
  const apiBaseUrl = process.env.API_BASE_URL;
  if (apiBaseUrl) {
    if (!isDevelopment && (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1'))) {
      console.error('[API Route Config] ❌ 错误：生产环境 API_BASE_URL 包含 localhost！', apiBaseUrl);
      throw new Error('生产环境 API 配置错误：API_BASE_URL 包含 localhost。请设置正确的环境变量。');
    }
    const url = apiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 NEXT_PUBLIC_API_BASE_URL
  const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (publicApiBaseUrl) {
    if (!isDevelopment && (publicApiBaseUrl.includes('localhost') || publicApiBaseUrl.includes('127.0.0.1'))) {
      console.error('[API Route Config] ❌ 错误：生产环境 NEXT_PUBLIC_API_BASE_URL 包含 localhost！', publicApiBaseUrl);
      throw new Error('生产环境 API 配置错误：NEXT_PUBLIC_API_BASE_URL 包含 localhost。请设置正确的环境变量。');
    }
    const url = publicApiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // [2025-12-09] 生产环境必须配置环境变量
  if (!isDevelopment) {
    const errorMsg = '生产环境未配置 API 地址环境变量。请设置 NEXT_PUBLIC_API_URL、API_BASE_URL 或 NEXT_PUBLIC_API_BASE_URL。';
    console.error('[API Route Config] ❌', errorMsg);
    console.error('[API Route Config] 当前环境变量:', {
      NEXT_PUBLIC_API_URL: publicApiUrl || '未设置',
      API_BASE_URL: apiBaseUrl || '未设置',
      NEXT_PUBLIC_API_BASE_URL: publicApiBaseUrl || '未设置',
      NODE_ENV: process.env.NODE_ENV
    });
    throw new Error(errorMsg);
  }
  
  // [2025-12-09] 开发环境回退到 localhost
  console.warn('[API Route Config] ⚠️ 开发环境未配置 API 地址，使用默认值:', DEFAULT_API_BASE_DEV);
  return DEFAULT_API_BASE_DEV;
}

