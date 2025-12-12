/**
 * Server-side Session Utilities
 * [2025-01-27 14:35:00] 服务端认证检查工具函数
 */
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

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
 */
export async function getSession(): Promise<{ userId?: string; email?: string } | null> {
  try {
    const token = await getSessionToken();
    if (!token) {
      return null;
    }

    // [2025-01-27 16:15:00] 在服务端组件中，使用绝对 URL 调用内部 API 路由
    // 获取当前请求的 host，用于构建完整的 URL
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'localhost:3000';
    const baseUrl = `${protocol}://${host}`;
    
    const response = await fetch(`${baseUrl}/api/auth/me`, {
      method: 'GET',
      headers: {
        Cookie: `token=${token}`,
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
