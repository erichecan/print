/**
 * API Route Configuration
 * [2025-01-29 23:25:00] 统一管理 Next.js API 路由的后端 URL 配置
 */

// [2025-01-29 12:30:00] 开发环境默认 API 地址
const DEFAULT_API_BASE_DEV = 'http://localhost:3001/api';

/**
 * 获取后端 API 基础 URL
 * [2025-01-29 23:25:00] 优先使用环境变量，确保生产环境正确配置
 * [2025-01-29 12:30:00] 修复：生产环境不会回退到 localhost
 * [2025-12-02 04:05:00] 添加 Cloud Run 生产环境兜底逻辑
 */
export function getBackendApiBase(): string {
  // [2025-12-07 18:50:00] 优先使用 NEXT_PUBLIC_API_URL（前端环境变量）
  // 注意：NEXT_PUBLIC_* 变量在构建时内联，运行时可能无法读取
  const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (publicApiUrl) {
    // [2025-12-07 18:50:00] 如果包含 localhost，在生产环境应该警告但继续使用（开发环境允许）
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && (publicApiUrl.includes('localhost') || publicApiUrl.includes('127.0.0.1'))) {
      console.warn('[API Route Config] ⚠️ 警告：生产环境检测到 localhost API 地址！', publicApiUrl);
      console.warn('[API Route Config] 请设置 NEXT_PUBLIC_API_URL 环境变量指向生产环境的 API 服务器');
    }
    // [2025-12-07 18:50:00] 开发环境允许 localhost，生产环境如果包含 localhost 则使用硬编码后端地址
    if (!isDevelopment && (publicApiUrl.includes('localhost') || publicApiUrl.includes('127.0.0.1'))) {
      const backendApiUrl = 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api';
      console.warn('[API Route Config] 使用硬编码后端地址替代 localhost:', backendApiUrl);
      return backendApiUrl;
    }
    const url = publicApiUrl.replace(/\/$/, '');
    // 确保包含 /api 路径
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 API_BASE_URL（服务器端环境变量）
  const apiBaseUrl = process.env.API_BASE_URL;
  if (apiBaseUrl) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && (apiBaseUrl.includes('localhost') || apiBaseUrl.includes('127.0.0.1'))) {
      const backendApiUrl = 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api';
      console.warn('[API Route Config] ⚠️ 警告：生产环境 API_BASE_URL 包含 localhost，使用硬编码后端地址:', backendApiUrl);
      return backendApiUrl;
    }
    const url = apiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 NEXT_PUBLIC_API_BASE_URL
  const publicApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (publicApiBaseUrl) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && (publicApiBaseUrl.includes('localhost') || publicApiBaseUrl.includes('127.0.0.1'))) {
      const backendApiUrl = 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api';
      console.warn('[API Route Config] ⚠️ 警告：生产环境 NEXT_PUBLIC_API_BASE_URL 包含 localhost，使用硬编码后端地址:', backendApiUrl);
      return backendApiUrl;
    }
    const url = publicApiBaseUrl.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // [2025-01-29 12:30:00] 生产环境不应该回退到 localhost
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment) {
    // [2025-12-07 04:30:00] 生产环境强制使用后端 API 地址，避免使用 localhost
    const backendApiUrl = 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api';
    console.warn('[API Route Config] ⚠️ 检测到生产环境，但 NEXT_PUBLIC_API_URL 未配置或包含 localhost，使用后端地址:', backendApiUrl);
    console.warn('[API Route Config] 当前环境变量:', {
      NEXT_PUBLIC_API_URL: publicApiUrl || '未设置',
      API_BASE_URL: apiBaseUrl || '未设置',
      NODE_ENV: process.env.NODE_ENV
    });
    return backendApiUrl;
  }
  
  // [2025-12-02 04:10:00] 开发环境也不应该返回相对路径，应该返回完整 URL
  // 如果开发环境也没有配置，返回 localhost
  return DEFAULT_API_BASE_DEV;
}

