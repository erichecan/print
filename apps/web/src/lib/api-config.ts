/**
 * API Configuration
 * [2025-11-15 11:20:00] 集中管理 API 配置，确保正确使用环境变量
 */

// [2025-11-15 11:20:00] 确保 API_BASE_URL 始终以 /api 结尾
function getApiBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL;
  
  if (!envUrl) {
    // 开发环境默认值
    return 'http://localhost:3000/api';
  }
  
  // 移除末尾的斜杠
  const cleanUrl = envUrl.replace(/\/+$/, '');
  
  // 如果 URL 不以 /api 结尾，自动添加
  if (!cleanUrl.endsWith('/api')) {
    return `${cleanUrl}/api`;
  }
  
  return cleanUrl;
}

export const API_BASE_URL = getApiBaseUrl();

// [2025-11-15 11:20:00] 在开发环境输出配置信息（仅客户端）
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[API Config] API_BASE_URL:', API_BASE_URL);
  console.log('[API Config] NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
}

