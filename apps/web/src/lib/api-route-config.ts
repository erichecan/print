/**
 * API Route Configuration
 * [2025-01-29 23:25:00] 统一管理 Next.js API 路由的后端 URL 配置
 */

const DEFAULT_API_BASE = 'http://localhost:3001/api';

/**
 * 获取后端 API 基础 URL
 * [2025-01-29 23:25:00] 优先使用环境变量，确保生产环境正确配置
 */
export function getBackendApiBase(): string {
  // 优先使用 NEXT_PUBLIC_API_URL（前端环境变量）
  if (process.env.NEXT_PUBLIC_API_URL) {
    const url = process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
    // 确保包含 /api 路径
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 API_BASE_URL（服务器端环境变量）
  if (process.env.API_BASE_URL) {
    const url = process.env.API_BASE_URL.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 回退到 NEXT_PUBLIC_API_BASE_URL
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    const url = process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, '');
    return url.endsWith('/api') ? url : `${url}/api`;
  }
  
  // 开发环境默认
  return DEFAULT_API_BASE;
}

