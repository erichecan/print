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
  // [2025-12-09] 优先使用环境变量
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // [2025-12-09] 如果环境变量存在，检查是否包含 localhost（生产环境不允许）
  if (envUrl) {
    // 生产环境不允许 localhost
    if (!isDevelopment && (envUrl.includes('localhost') || envUrl.includes('127.0.0.1'))) {
      console.error('[API Config] ❌ 错误：生产环境检测到 localhost API 地址！', envUrl);
      console.error('[API Config] 请设置 NEXT_PUBLIC_API_URL 环境变量指向正确的生产环境 API 服务器');
      // 在生产环境抛出错误，而不是使用硬编码地址
      if (typeof window === 'undefined') {
        throw new Error('生产环境 API 配置错误：检测到 localhost 地址。请设置 NEXT_PUBLIC_API_URL 环境变量。');
      }
    }
    return normalizeApiUrl(envUrl);
  }

  // [2025-12-01 12:45:00] 浏览器环境：根据当前域名决定 API 地址
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // 开发环境且是 localhost，直接指向后端服务器
    if (isLocalhost && isDevelopment) {
      return 'http://localhost:3001/api';
    }
    
    // [2025-12-01 12:45:00] Cloud Run 生产环境：使用前端代理路由
    const hostname = window.location.hostname;
    if (hostname.includes('print-main-frontend') && hostname.endsWith('.us-central1.run.app')) {
      // [2025-12-07 13:40:00] 使用前端代理路由，而不是直接连接后端
      // 这样可以利用 Next.js API 路由的代理功能，确保 Cookie 和认证正确传递
      console.warn('[API Config] ⚠️ 检测到 Cloud Run 前端环境，使用前端代理路由');
      return '/api'; // 使用相对路径，通过 Next.js API 路由代理
    }
    
    // 生产环境或其他情况，使用同源 URL
    return normalizeApiUrl(window.location.origin);
  }

  // [2025-12-07 18:50:00] SSR/构建时：优先使用部署 URL
  const deployUrl = process.env.DEPLOY_URL || process.env.URL;
  if (deployUrl) {
    return normalizeApiUrl(deployUrl);
  }

  // [2025-12-09] 生产环境必须配置环境变量
  if (!isDevelopment) {
    const errorMsg = '生产环境未配置 API 地址环境变量。请设置 NEXT_PUBLIC_API_URL、API_BASE_URL 或 NEXT_PUBLIC_API_BASE_URL。';
    console.error('[API Config] ❌', errorMsg);
    // SSR 时抛出错误
    if (typeof window === 'undefined') {
      throw new Error(errorMsg);
    }
    // 浏览器环境回退到相对路径
    return '/api';
  }

  // [2025-01-29 12:30:00] 仅开发环境使用 localhost 作为最终回退
  console.warn('[API Config] ⚠️ 开发环境未配置 API 地址，使用默认值: http://localhost:3001/api');
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

