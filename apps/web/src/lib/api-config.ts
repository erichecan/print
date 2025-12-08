/**
 * API Configuration
 * [2025-11-15 11:20:00] 集中管理 API 配置，确保正确使用环境变量
 */

// [2025-11-16 15:50:00] 生产环境容错：优先使用环境变量；否则回退到同源 /api，最后再回退到 3001
function normalizeApiUrl(base: string): string {
  const clean = base.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

function getApiBaseUrl(): string {
  // [2025-01-29 12:30:00] 优先使用环境变量
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL;
  if (envUrl) {
    return normalizeApiUrl(envUrl);
  }

  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // [2025-12-01 12:45:00] 浏览器环境：根据当前域名决定 API 地址
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // 开发环境且是 localhost，直接指向后端服务器
    if (isLocalhost && isDevelopment) {
      return 'http://localhost:3001/api';
    }
    
    // [2025-12-01 12:45:00] Cloud Run 生产环境兜底：如果检测到是 print-main-frontend 域名，使用前端代理路由
    // 这是为了解决 Cloud Run 上 NEXT_PUBLIC_API_URL 可能未正确配置的问题
    const hostname = window.location.hostname;
    if (hostname.includes('print-main-frontend') && hostname.endsWith('.us-central1.run.app')) {
      // [2025-12-07 13:40:00] 使用前端代理路由，而不是直接连接后端
      // 这样可以利用 Next.js API 路由的代理功能，确保 Cookie 和认证正确传递
      console.warn('[API Config] ⚠️ 检测到 Cloud Run 前端环境，使用前端代理路由');
      return '/api'; // 使用相对路径，通过 Next.js API 路由代理
    }
    
    // 生产环境或其他情况，使用同源 URL（避免硬编码 localhost）
    return normalizeApiUrl(window.location.origin);
  }

  // [2025-12-07 18:50:00] SSR/构建时：优先使用部署 URL
  const deployUrl = process.env.DEPLOY_URL || process.env.URL;
  if (deployUrl) {
    return normalizeApiUrl(deployUrl);
  }

  // [2025-12-07 18:50:00] 生产环境不应该回退到 localhost，应该使用硬编码的后端地址或相对路径
  if (!isDevelopment) {
    // [2025-12-07 18:50:00] 生产环境：如果没有配置环境变量，使用硬编码的后端地址
    // 避免使用 localhost 导致警告
    const backendApiUrl = 'https://print-main-backend-hsbqzlnkxa-uc.a.run.app/api';
    console.warn('[API Config] ⚠️ 生产环境未配置 NEXT_PUBLIC_API_URL，使用硬编码后端地址:', backendApiUrl);
    return backendApiUrl;
  }

  // [2025-01-29 12:30:00] 仅开发环境使用 localhost 作为最终回退
  return 'http://localhost:3001/api';
}

export const API_BASE_URL = getApiBaseUrl();

// [2025-01-29 12:30:00] 配置检查和日志输出
if (typeof window !== 'undefined') {
  if (process.env.NODE_ENV === 'development') {
    // 开发环境：输出配置信息用于调试
    console.log('[API Config] API_BASE_URL:', API_BASE_URL);
    console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
  } else {
    // 生产环境：检查是否使用了 localhost（配置错误）
    if (API_BASE_URL.includes('localhost') || API_BASE_URL.includes('127.0.0.1')) {
      console.error('[API Config] ⚠️ 警告：生产环境检测到 localhost API 地址！');
      console.error('[API Config] 请设置 NEXT_PUBLIC_API_URL 环境变量指向生产环境的 API 服务器');
      console.error('[API Config] 当前 API_BASE_URL:', API_BASE_URL);
    }
  }
}

