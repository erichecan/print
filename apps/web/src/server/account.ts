/**
 * Server-side Account Utilities
 * [2025-01-27 18:00:00] 服务端账户数据获取安全封装，使用 Result 风格避免抛错
 */
import { getBackendApiBaseUrl } from '@/config/env';
import { generateTraceId } from '@/shared/errors';

/**
 * Result 类型：安全的数据获取结果
 * [2025-01-27 18:00:00]
 */
export type Result<T> = 
  | { ok: true; data: T }
  | { ok: false; code: string; message?: string; statusCode?: number };

/**
 * 安全获取会话信息（不抛错）
 * [2025-01-27 18:00:00]
 */
export async function getSessionSafe(requestId?: string): Promise<Result<{ userId: string; email: string; [key: string]: any }>> {
  const traceId = requestId || generateTraceId();
  const timestamp = new Date().toISOString();
  
  try {
    // 导入 cookies（Next.js 14 App Router）
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || null;
    
    if (!token) {
      console.info('[Account] No token found', { traceId, timestamp });
      return { ok: false, code: 'NO_TOKEN', message: 'No authentication token found' };
    }

    // 获取后端 API URL（可能抛出错误）
    let backendApiUrl: string;
    try {
      backendApiUrl = getBackendApiBaseUrl();
    } catch (configError) {
      console.error('[Account] Failed to get backend API URL', { 
        traceId, 
        timestamp,
        error: configError instanceof Error ? configError.message : String(configError)
      });
      return { 
        ok: false, 
        code: 'CONFIG_ERROR', 
        message: 'Backend API configuration error' 
      };
    }

    // 调用后端 API
    const response = await fetch(`${backendApiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Request-Id': traceId,
        'X-Trace-Id': traceId,
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.warn('[Account] Backend API returned non-OK status', { 
        traceId, 
        timestamp,
        status: response.status,
        statusText: response.statusText
      });
      return { 
        ok: false, 
        code: 'AUTH_FAILED', 
        message: 'Authentication failed',
        statusCode: response.status
      };
    }

    const user = await response.json();
    console.info('[Account] Session retrieved successfully', { 
      traceId, 
      timestamp,
      userId: user.id || user.userId,
      email: user.email?.substring(0, 3) + '***'
    });
    
    return { 
      ok: true, 
      data: {
        userId: user.id || user.userId,
        email: user.email,
        ...user
      }
    };
  } catch (error) {
    console.error('[Account] getSessionSafe error', {
      traceId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return { 
      ok: false, 
      code: 'UNKNOWN_ERROR', 
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * 安全获取账户数据（不抛错）
 * [2025-01-27 18:05:00]
 */
export async function getAccountDataSafe(
  userId: string, 
  ctx: { requestId?: string } = {}
): Promise<Result<{ user: any; orders?: any[]; designs?: any[] }>> {
  const traceId = ctx.requestId || generateTraceId();
  const timestamp = new Date().toISOString();
  
  try {
    // 获取后端 API URL
    let backendApiUrl: string;
    try {
      backendApiUrl = getBackendApiBaseUrl();
    } catch (configError) {
      console.error('[Account] Failed to get backend API URL for data fetch', { 
        traceId, 
        timestamp,
        error: configError instanceof Error ? configError.message : String(configError)
      });
      return { 
        ok: false, 
        code: 'CONFIG_ERROR', 
        message: 'Backend API configuration error' 
      };
    }

    // 获取用户信息和订单（可以并行获取）
    const [userResponse, ordersResponse] = await Promise.allSettled([
      fetch(`${backendApiUrl}/auth/me`, {
        headers: {
          'X-Request-Id': traceId,
          'X-Trace-Id': traceId,
        },
        cache: 'no-store',
      }),
      fetch(`${backendApiUrl}/orders?limit=5`, {
        headers: {
          'X-Request-Id': traceId,
          'X-Trace-Id': traceId,
        },
        cache: 'no-store',
      }).catch(() => null), // 订单获取失败不影响主流程
    ]);

    const user = userResponse.status === 'fulfilled' && userResponse.value.ok
      ? await userResponse.value.json()
      : null;

    const orders = ordersResponse.status === 'fulfilled' && ordersResponse.value?.ok
      ? await ordersResponse.value.json()
      : null;

    if (!user) {
      console.warn('[Account] Failed to fetch user data', { traceId, timestamp });
      return { 
        ok: false, 
        code: 'USER_FETCH_FAILED', 
        message: 'Failed to fetch user data' 
      };
    }

    console.info('[Account] Data retrieved successfully', { 
      traceId, 
      timestamp,
      userId: user.id || user.userId,
      hasOrders: !!orders
    });

    return { 
      ok: true, 
      data: { 
        user,
        orders: orders?.orders || orders?.data || [],
        designs: [] // TODO: 如果需要，可以添加设计数据获取
      }
    };
  } catch (error) {
    console.error('[Account] getAccountDataSafe error', {
      traceId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return { 
      ok: false, 
      code: 'DATA_FETCH_FAILED', 
      message: error instanceof Error ? error.message : 'Failed to fetch account data'
    };
  }
}
