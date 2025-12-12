/**
 * Server-side Session Utilities
 * [2025-01-27 14:35:00] 服务端认证检查工具函数
 * [2025-01-27 17:10:00] 修复：直接调用后端 API，而不是通过 Next.js API 路由
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getBackendApiBaseUrl } from '@/config/env';

/**
 * Get session token from cookies
 * [2025-01-27 14:35:00]
 */
export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value || null;
}

/**
 * Check if user is authenticated (server-side)
 * [2025-01-27 14:35:00]
 * [2025-01-27 17:10:00] 修复：直接调用后端 API，使用 Authorization header 传递 token
 * [2025-01-27 17:20:00] 修复：增强错误处理，避免因配置错误导致页面崩溃
 */
export async function getSession(): Promise<{ userId?: string; email?: string } | null> {
  try {
    const token = await getSessionToken();
    if (!token) {
      return null;
    }

    // [2025-01-27 17:20:00] 捕获 getBackendApiBaseUrl 可能抛出的错误
    let backendApiUrl: string;
    try {
      backendApiUrl = getBackendApiBaseUrl();
    } catch (configError) {
      console.error('[getSession] Failed to get backend API URL:', configError);
      // 配置错误时返回 null，让用户重定向到登录页
      return null;
    }

    // [2025-01-27 17:10:00] 直接调用后端 API，使用 Authorization header 传递 token
    // 后端 authenticate 中间件支持从 Cookie 或 Authorization header 读取 token
    const response = await fetch(`${backendApiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      // [2025-01-27 17:20:00] 记录非 200 响应，但不抛出错误
      console.warn('[getSession] Backend API returned non-OK status:', response.status);
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    // [2025-01-27 17:20:00] 记录详细错误信息，但不抛出错误，避免页面崩溃
    console.error('[getSession] Error:', error instanceof Error ? error.message : String(error));
    if (error instanceof Error && error.stack) {
      console.error('[getSession] Stack:', error.stack);
    }
    return null;
  }
}

/**
 * Require authentication, redirect to login if not authenticated
 * [2025-01-27 14:35:00]
 */
export async function requireAuth(): Promise<{ userId: string; email: string }> {
  const session = await getSession();
  if (!session || !session.userId) {
    redirect('/login?redirect=/account');
  }
  return session as { userId: string; email: string };
}
