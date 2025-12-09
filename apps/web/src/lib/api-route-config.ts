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
  // [2025-12-09] 检测是否在构建时（Next.js 构建阶段）
  // 构建时允许使用默认值，运行时再严格检查
  // 如果 NEXT_PHASE 存在，说明在构建阶段
  const isBuildTime = !!process.env.NEXT_PHASE;
  
  // [2025-12-09] 优先使用 NEXT_PUBLIC_API_URL（前端环境变量）
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicApiUrl) {
    // [2025-12-09] 构建时完全跳过 localhost 检查
    // 只在运行时（非构建时）检查 localhost
    if (!isDevelopment && !isBuildTime && (publicApiUrl.includes('localhost') || publicApiUrl.includes('127.0.0.1'))) {
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
    // [2025-12-09] 构建时完全跳过 localhost 检查
    if (!isDevelopment && !isBuildTime && (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1'))) {
      console.error('[API Route Config] ❌ 错误：生产环境 API_BASE_URL 包含 localhost！', apiBaseUrl);
      throw new Error('生产环境 API 配置错误：API_BASE_URL 包含 localhost。请设置正确的环境变量。');
    }
    const url = apiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 NEXT_PUBLIC_API_BASE_URL
  const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (publicApiBaseUrl) {
    // [2025-12-09] 构建时完全跳过 localhost 检查
    if (!isDevelopment && !isBuildTime && (publicApiBaseUrl.includes('localhost') || publicApiBaseUrl.includes('127.0.0.1'))) {
      console.error('[API Route Config] ❌ 错误：生产环境 NEXT_PUBLIC_API_BASE_URL 包含 localhost！', publicApiBaseUrl);
      throw new Error('生产环境 API 配置错误：NEXT_PUBLIC_API_BASE_URL 包含 localhost。请设置正确的环境变量。');
    }
    const url = publicApiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // [2025-12-09] 构建时允许回退到默认值，运行时再检查
  if (!isDevelopment && !isBuildTime) {
    const errorMsg = '生产环境未配置 API 地址环境变量。请设置 NEXT_PUBLIC_API_URL、API_BASE_URL 或 NEXT_PUBLIC_API_BASE_URL。';
    console.error('[API Route Config] ❌', errorMsg);
    console.error('[API Route Config] 当前环境变量:', {
      NEXT_PUBLIC_API_URL: publicApiUrl || '未设置',
      API_BASE_URL: apiBaseUrl || '未设置',
      NEXT_PUBLIC_API_BASE_URL: publicApiBaseUrl || '未设置',
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PHASE: process.env.NEXT_PHASE
    });
    throw new Error(errorMsg);
  }
  
  // [2025-12-09] 开发环境或构建时回退到 localhost
  if (isBuildTime) {
    console.warn('[API Route Config] ⚠️ 构建时未配置 API 地址，使用默认值（运行时需要配置环境变量）:', DEFAULT_API_BASE_DEV);
  } else {
    console.warn('[API Route Config] ⚠️ 开发环境未配置 API 地址，使用默认值:', DEFAULT_API_BASE_DEV);
  }
  return DEFAULT_API_BASE_DEV;
}

