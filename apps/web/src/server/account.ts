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
  
  // [2025-12-12 14:15:00] 增强：记录函数调用开始
  console.debug('[Account] getSessionSafe called', { traceId, timestamp, hasRequestId: !!requestId });
  
  try {
    // 导入 cookies（Next.js 14 App Router）
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value || null;
    
    if (!token) {
      console.info('[Account] No token found', { traceId, timestamp });
      return { ok: false, code: 'NO_TOKEN', message: 'No authentication token found' };
    }
    
    // [2025-12-12 14:15:00] 增强：记录 token 存在（不记录完整 token）
    console.debug('[Account] Token found, proceeding to fetch session', { 
      traceId, 
      timestamp,
      tokenLength: token?.length || 0,
      tokenPrefix: token ? token.substring(0, 10) + '...' : 'null',
    });

    // [2025-12-12 14:15:00] 获取后端 API URL（可能抛出错误）
    let backendApiUrl: string;
    try {
      backendApiUrl = getBackendApiBaseUrl();
      // [2025-12-12 14:15:00] 增强：记录成功获取 API URL（不记录完整 URL 以避免泄露）
      console.debug('[Account] Backend API URL retrieved', {
        traceId,
        timestamp,
        urlLength: backendApiUrl.length,
        urlHost: new URL(backendApiUrl).hostname,
      });
    } catch (configError) {
      // [2025-01-30 19:00:00] 增强：记录详细的配置错误信息，确保错误被完全捕获
      console.error('[Account] Failed to get backend API URL', { 
        traceId, 
        timestamp,
        error: configError instanceof Error ? configError.message : String(configError),
        errorName: configError instanceof Error ? configError.name : 'Unknown',
        errorStack: process.env.NODE_ENV === 'development' && configError instanceof Error ? configError.stack : undefined,
        // [2025-01-30 19:00:00] 记录当前环境变量状态（用于调试）
        envVars: {
          NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ? '已设置' : '未设置',
          API_BASE_URL: process.env.API_BASE_URL ? '已设置' : '未设置',
          NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ? '已设置' : '未设置',
          NODE_ENV: process.env.NODE_ENV,
          NEXT_PHASE: process.env.NEXT_PHASE,
        },
      });
      // [2025-01-30 19:00:00] 返回错误结果，不抛出错误，避免导致 Server Component 渲染失败
      return { 
        ok: false, 
        code: 'CONFIG_ERROR', 
        message: configError instanceof Error ? configError.message : 'Backend API configuration error',
      };
    }

    // [2025-12-12 14:15:00] 修复：添加 fetch 超时和网络错误处理
    // 创建 AbortController 用于超时控制
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
    
    let response: Response;
    try {
      // 调用后端 API
      response = await fetch(`${backendApiUrl}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'X-Request-Id': traceId,
          'X-Trace-Id': traceId,
        },
        cache: 'no-store',
        signal: controller.signal, // [2025-12-12 14:15:00] 添加超时控制
      });
    } catch (fetchError) {
      clearTimeout(timeoutId);
      
      // [2025-12-12 14:15:00] 处理网络错误、超时等 fetch 异常
      const isAbortError = fetchError instanceof Error && fetchError.name === 'AbortError';
      const isNetworkError = fetchError instanceof TypeError && 
                            (fetchError.message.includes('fetch') || 
                             fetchError.message.includes('network') ||
                             fetchError.message.includes('Failed to fetch'));
      
      console.error('[Account] Fetch error in getSessionSafe', {
        traceId,
        timestamp,
        error: fetchError instanceof Error ? fetchError.message : String(fetchError),
        errorName: fetchError instanceof Error ? fetchError.name : 'Unknown',
        isAbortError,
        isNetworkError,
      });
      
      return {
        ok: false,
        code: isAbortError ? 'TIMEOUT' : isNetworkError ? 'NETWORK_ERROR' : 'FETCH_ERROR',
        message: isAbortError 
          ? 'Request timeout: Backend API did not respond in time'
          : isNetworkError
          ? 'Network error: Unable to connect to backend API'
          : 'Failed to fetch user session',
      };
    }
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Account] Backend API returned non-OK status', { 
        traceId, 
        timestamp,
        status: response.status,
        statusText: response.statusText,
        // [2025-12-12 14:15:00] 添加响应头信息用于调试
        headers: Object.fromEntries(response.headers.entries()),
      });
      return { 
        ok: false, 
        code: 'AUTH_FAILED', 
        message: 'Authentication failed',
        statusCode: response.status
      };
    }

    // [2025-12-12 14:15:00] 修复：添加 JSON 解析错误处理
    let user: any;
    try {
      user = await response.json();
    } catch (jsonError) {
      console.error('[Account] Failed to parse response JSON', {
        traceId,
        timestamp,
        error: jsonError instanceof Error ? jsonError.message : String(jsonError),
        status: response.status,
        statusText: response.statusText,
      });
      return {
        ok: false,
        code: 'PARSE_ERROR',
        message: 'Failed to parse backend response',
      };
    }
    // [2025-12-12 14:15:00] 增强：记录成功获取会话的详细信息
    console.info('[Account] Session retrieved successfully', { 
      traceId, 
      timestamp,
      userId: user.id || user.userId,
      email: user.email ? user.email.substring(0, 3) + '***' : 'no-email',
      // [2025-12-12 14:15:00] 记录响应状态用于调试
      responseStatus: response.status,
      responseHeaders: {
        contentType: response.headers.get('content-type'),
        requestId: response.headers.get('x-request-id'),
      },
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
    // [2025-12-12 14:15:00] 增强：记录详细的错误信息，包括错误类型和上下文
    console.error('[Account] getSessionSafe error', {
      traceId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
      errorName: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      // [2025-12-12 14:15:00] 记录错误类型用于分类
      errorType: error instanceof TypeError ? 'TypeError' :
                 error instanceof Error && error.name === 'AbortError' ? 'AbortError' :
                 error instanceof Error ? error.constructor.name : 'Unknown',
      // [2025-12-12 14:15:00] 记录环境信息用于调试
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PHASE: process.env.NEXT_PHASE,
      },
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
