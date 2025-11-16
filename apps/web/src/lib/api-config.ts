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
  const envUrl = process.env.NEXT_PUBLIC_API_URL || process.env.API_BASE_URL;
  if (envUrl) {
    return normalizeApiUrl(envUrl);
  }

  // Browser runtime: use same-origin by default to避免线上错误指向 localhost
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
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

