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
  
  // [2025-01-29 12:30:00] 生产环境不应该回退到 localhost
  const isDevelopment = process.env.NODE_ENV === 'development';
  if (!isDevelopment) {
    // [2025-12-02 04:05:00] Cloud Run 生产环境兜底：如果检测到是 print-main-frontend 域名，强制使用后端 API
    // 这是为了解决 Cloud Run 上 NEXT_PUBLIC_API_URL 可能未正确配置的问题
    // 在服务器端运行时，我们无法访问 window.location，但可以通过环境变量或硬编码判断
    const backendApiUrl = 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api';
    console.warn('[API Route Config] ⚠️ 检测到生产环境，但 NEXT_PUBLIC_API_URL 未配置，使用硬编码后端地址:', backendApiUrl);
    return backendApiUrl;
  }
  
  // [2025-12-02 04:10:00] 开发环境也不应该返回相对路径，应该返回完整 URL
  // 如果开发环境也没有配置，返回 localhost
  return DEFAULT_API_BASE_DEV;
  
  // 仅开发环境使用 localhost 默认值
  return DEFAULT_API_BASE_DEV;
}

