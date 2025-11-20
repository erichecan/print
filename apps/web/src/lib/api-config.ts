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
  // [2025-01-27 18:30:00] 优先使用环境变量
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL;
  if (envUrl) {
    return normalizeApiUrl(envUrl);
  }

  // [2025-01-27 18:30:00] 浏览器环境：开发环境时明确指向后端服务器
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // 开发环境且是 localhost，直接指向后端服务器
    if (isLocalhost && isDevelopment) {
      return 'http://localhost:3001/api';
    }
    
    // 生产环境或其他情况，使用同源 URL
    return normalizeApiUrl(window.location.origin);
  }

  // Build/SSR fallback on Netlify: use DEPLOY_URL or URL if provided
  const deployUrl = process.env.DEPLOY_URL || process.env.URL;
  if (deployUrl) {
    return normalizeApiUrl(deployUrl);
  }

  // Final local fallback (dev only)
  return 'http://localhost:3001/api';
}

export const API_BASE_URL = getApiBaseUrl();

// [2025-11-15 11:20:00] 在开发环境输出配置信息（仅客户端）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[API Config] API_BASE_URL:', API_BASE_URL);
  console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
}

