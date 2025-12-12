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
 * [2025-01-27 17:10:00] 修复：直接调用后端 API，确保 Cookie 正确传递
 */
export async function getSession(): Promise<{ userId?: string; email?: string } | null> {
  try {
    const token = await getSessionToken();
    if (!token) {
      return null;
    }

    // [2025-01-27 17:10:00] 直接调用后端 API，而不是通过 Next.js API 路由
    // 这样可以确保 Cookie 正确传递
    const backendApiUrl = getBackendApiBaseUrl();
    const response = await fetch(`${backendApiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: `token=${token}`,
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return null;
    }

    const user = await response.json();
    return user;
  } catch (error) {
    console.error('[getSession] Error:', error);
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
