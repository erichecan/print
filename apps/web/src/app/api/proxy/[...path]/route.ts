/**
 * Next.js API Route: 通用 API 代理
* 代理所有需要认证的后端 API 请求，确保 Cookie 正确传递
* 修复：添加 traceId、超时控制、重试机制、统一错误包装
 * 
 * 使用方式：
 * - GET /api/proxy/orders?page=1&limit=100
 * - POST /api/proxy/admin/products
 * - 等等...
* 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextRequest, NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/config/env';
import { generateTraceId, createErrorResponse, ErrorCode } from '@/shared/errors';

// 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

// 修复：使用统一的环境变量配置模块
// 延迟获取 API_BASE，确保在运行时获取正确的环境变量
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy] Failed to get backend API base:', errorMessage);
// 如果获取失败，在生产环境抛出错误，开发环境回退到 localhost
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
// 修复：与本仓库默认本地后端端口 4000 对齐（webapp-testing/Playwright/后端启动脚本）
    return 'http://localhost:3001/api';
  }
}

// 需要认证的 API 路径前缀
const AUTH_REQUIRED_PATHS = [
  '/orders',
  '/admin',
  '/auth/me',
  '/addresses',
  '/designs',
  '/cart',
'/sales', // Sales API 需要认证
];

// 代理配置：超时和重试
// 修复：增加超时时间以覆盖 Cloud Run 冷启动（2-5秒）
const PROXY_TIMEOUT_MS = 15000; // 15秒超时（覆盖冷启动 + 处理时间）
const MAX_RETRIES = 2; // 最多重试2次（给冷启动更多机会）
const RETRY_DELAY_MS = 1000; // 重试间隔1秒（给冷启动时间）

/**
 * 检查路径是否需要认证
 */
function requiresAuth(path: string): boolean {
  return AUTH_REQUIRED_PATHS.some(prefix => path.startsWith(prefix));
}

/**
 * 带超时的 fetch 请求
* 添加超时控制，避免请求悬挂
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = PROXY_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * 带重试的请求转发
* 添加重试机制，提高可靠性
* 修复：增强错误捕获和诊断日志
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit,
  maxRetries: number = MAX_RETRIES,
  traceId?: string
): Promise<Response> {
  let lastError: Error | null = null;
  const errors: Array<{ attempt: number; error: string; timestamp: string }> = [];
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const attemptStartTime = Date.now();
    console.log(`[API Proxy] 🔄 Attempt ${attempt + 1}/${maxRetries + 1}`, {
      traceId,
      url,
      attempt: attempt + 1,
      totalAttempts: maxRetries + 1,
    });
    try {
      const response = await fetchWithTimeout(url, options);
// 记录成功信息
// 修复：记录所有尝试的成功信息
      console.log(`[API Proxy] ✅ Attempt ${attempt + 1} succeeded`, {
        traceId,
        url,
        attempt: attempt + 1,
        totalAttempts: attempt + 1,
        latency: Date.now() - attemptStartTime,
        status: response.status,
        statusText: response.statusText,
      });
      return response;
    } catch (error: any) {
      const errorInfo = {
        attempt,
        error: error?.message || String(error),
        name: error?.name,
        timestamp: new Date().toISOString(),
        latency: Date.now() - attemptStartTime,
      };
      errors.push(errorInfo);
      lastError = error;
      
// 记录每次尝试的详细错误信息
      console.error(`[API Proxy] ❌ Fetch attempt ${attempt + 1}/${maxRetries + 1} failed:`, {
        traceId,
        url,
        ...errorInfo,
        stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      });
      
      // 如果是最后一次尝试，抛出包含所有错误信息的错误
      if (attempt === maxRetries) {
        const enhancedError = new Error(
          `Request failed after ${maxRetries + 1} attempts. Last error: ${error?.message || 'Unknown error'}`
        ) as any;
        enhancedError.originalError = error;
        enhancedError.allErrors = errors;
        enhancedError.url = url;
        throw enhancedError;
      }
      
// 修复：增加重试间隔，给冷启动更多时间
      const retryDelay = RETRY_DELAY_MS * (attempt + 1);
      console.log(`[API Proxy] ⏳ Retrying in ${retryDelay}ms...`, {
        traceId,
        url,
        attempt: attempt + 1,
        nextAttempt: attempt + 2,
      });
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  throw lastError || new Error('Request failed after retries');
}

/**
 * 处理所有 HTTP 方法的代理请求
* 修复：兼容 Next.js 14 和 15 的参数类型
 * 注意：Next.js 14 使用同步对象，Next.js 15 使用 Promise
 */
async function handleProxyRequest(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
// 修复：Next.js 14.2.33 使用同步对象，直接使用 params
// 生成 traceId 用于请求追踪
  const timestamp = new Date().toISOString();
  const traceId = generateTraceId();
  
// 添加初始日志，确认函数被调用
  console.log('[API Proxy] handleProxyRequest called', {
    timestamp,
    traceId,
    url: request.nextUrl.pathname,
    method: request.method,
    params: context.params,
    path: context.params?.path,
  });
  
  let params: { path: string[] };
  try {
// Next.js 14.2.33 使用同步对象，直接使用 params
    params = context.params;
    
// 验证 params 结构
    if (!params || typeof params !== 'object' || !('path' in params)) {
      console.error('[API Proxy] ❌ Invalid params structure:', {
        timestamp,
        params,
        paramsType: typeof params,
        hasPath: 'path' in (params || {}),
      });
      throw new Error('Invalid params structure: missing path property');
    }
    
// 增强日志：记录参数解析过程
    console.log('[API Proxy] 📍 Params resolved', {
      timestamp,
      hasParams: !!params,
      pathType: typeof params?.path,
      pathIsArray: Array.isArray(params?.path),
      pathValue: params?.path,
      urlPath: request.nextUrl.pathname,
      isPromise: context.params instanceof Promise,
    });
  } catch (e: any) {
    console.error('[API Proxy] ❌ Failed to resolve params:', {
      timestamp,
      error: e?.message,
      stack: e?.stack,
      params: context.params,
      paramsType: typeof context.params,
      isPromise: context.params instanceof Promise,
    });
    return NextResponse.json(
      { error: 'Invalid request parameters', message: e?.message || 'Failed to parse route parameters' },
      { status: 400 }
    );
  }
  
  try {
// 构建后端 API 路径
// 修复：确保 path 存在且是数组
// 增强：更健壮的路径解析
    let pathSegments: string[] = [];
    if (params?.path) {
      if (Array.isArray(params.path)) {
        pathSegments = params.path;
      } else if (typeof params.path === 'string') {
        pathSegments = [params.path];
      }
    }
    
// 如果 pathSegments 为空，尝试从 URL 中提取
    if (pathSegments.length === 0) {
      const urlPath = request.nextUrl.pathname;
      const match = urlPath.match(/^\/api\/proxy\/(.+)$/);
      if (match && match[1]) {
        pathSegments = match[1].split('/').filter(Boolean);
      }
    }
    
    const backendPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/';
    
// 增强日志：记录路径解析过程
    console.log('[API Proxy] 📍 Path Resolution', {
      timestamp,
      originalParams: params?.path,
      pathSegments,
      backendPath,
      urlPath: request.nextUrl.pathname,
    });
    
// 检查是否需要认证（可选，用于日志）
    const needsAuth = requiresAuth(backendPath);
    
// 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${backendPath}?${queryString}` : backendPath;
    
// 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
// 构建后端 URL
// 修复：API_BASE 已经包含 /api，直接拼接 backendPath
    // backendPath 已经以 / 开头（如 /cart, /sales/orders），所以直接拼接即可
    const upstreamUrl = `${API_BASE}${fullPath}`;
    
// 增强日志：记录完整的 URL 构建过程
    console.log('[API Proxy] 🔗 URL Construction', {
      timestamp,
      API_BASE,
      backendPath,
      fullPath,
      upstreamUrl,
    });
    
// 简化：直接从 Authorization header 读取 token（不再使用 Cookie）
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || null;
    const hasToken = !!token;
    
// 修复：购物车 API 需要 Cookie（sessionId）来识别访客购物车
// 准备请求头：同时支持 Authorization header 和 Cookie
    const cookieHeader = request.headers.get('cookie') || '';
    const hasCookie = !!cookieHeader;
    
// 增强日志：记录 Cookie 信息
    console.log('[API Proxy] 🔍 Request Details', {
      timestamp,
      method: request.method,
      path: backendPath,
      needsAuth,
      hasToken,
      hasCookie,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      cookieKeys: cookieHeader ? cookieHeader.split(';').map(c => c.split('=')[0].trim()).filter(Boolean) : [],
      queryString: queryString || 'none',
    });
    
// 添加 traceId 和 X-Request-Id 头
    const headers: HeadersInit = {
// 如果存在 token，添加到 Authorization header
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
// 修复：转发 Cookie 到后端，购物车功能需要 sessionId
      ...(cookieHeader ? { 'Cookie': cookieHeader } : {}),
// 添加追踪ID，便于上游服务日志关联
      'X-Request-Id': traceId,
      'X-Trace-Id': traceId,
    };
    
// 复制其他请求头（排除一些不需要的）
// 修复：不再排除 cookie，因为已经在上面单独处理了
    const excludeHeaders = ['host', 'connection', 'content-length', 'transfer-encoding', 'authorization', 'x-request-id', 'x-trace-id', 'cookie'];
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!excludeHeaders.includes(lowerKey)) {
        headers[key] = value;
      }
    });
    
// 添加 X-Forwarded-For 头
    const forwardedFor = request.headers.get('x-forwarded-for') || 
                         request.headers.get('x-real-ip') || 
                         'unknown';
    headers['X-Forwarded-For'] = forwardedFor;
    
// 准备请求体
    let body: BodyInit | undefined;
    const contentType = request.headers.get('content-type');
    
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      if (contentType?.includes('application/json')) {
        try {
          const jsonBody = await request.json();
          body = JSON.stringify(jsonBody);
        } catch (e) {
          // 如果无法解析 JSON，尝试作为文本
          body = await request.text();
        }
      } else if (contentType?.includes('multipart/form-data') || contentType?.includes('application/x-www-form-urlencoded')) {
        // FormData 需要特殊处理
        body = await request.formData();
      } else {
        // 其他类型，尝试作为文本
        try {
          body = await request.text();
        } catch (e) {
          // 如果无法读取，body 为 undefined
        }
      }
    }
    
// 增强日志：记录 Cookie 信息
    console.log('[API Proxy] Forwarding to upstream', {
      timestamp,
      traceId,
      url: upstreamUrl,
      method: request.method,
      hasToken,
      hasCookie,
      cookieKeys: cookieHeader ? cookieHeader.split(';').map(c => c.split('=')[0].trim()).filter(Boolean) : [],
      cookiePreview: cookieHeader ? cookieHeader.substring(0, 100) + (cookieHeader.length > 100 ? '...' : '') : 'none',
      headersCookie: headers['Cookie'] || 'none',
      hasBody: !!body
    });
    
// 转发请求到后端
// 使用带超时和重试的 fetch
// 修复：增强错误诊断和日志
// 修复：添加更多日志点，确保请求生命周期可追踪
    let upstream: Response;
    const requestStartTime = Date.now();
    console.log('[API Proxy] 🚀 Starting fetchWithRetry', {
      timestamp,
      traceId,
      url: upstreamUrl,
      method: request.method,
      maxRetries: MAX_RETRIES,
      timeout: PROXY_TIMEOUT_MS,
    });
    try {
// 修复：在服务器端，Cookie 需要手动添加到 headers 中
      // credentials: 'include' 在服务器端不起作用，因为服务器端 fetch 没有浏览器上下文
      // 我们已经手动将 Cookie 添加到 headers 中，所以不需要 credentials 选项
      upstream = await fetchWithRetry(
        upstreamUrl,
        {
          method: request.method,
          headers,
          body,
          cache: 'no-store',
        },
        MAX_RETRIES,
        traceId
      );
      
      console.log('[API Proxy] ✅ fetchWithRetry completed', {
        timestamp,
        traceId,
        url: upstreamUrl,
        status: upstream.status,
        statusText: upstream.statusText,
        duration: Date.now() - requestStartTime,
      });
      
      const requestDuration = Date.now() - requestStartTime;
      console.log('[API Proxy] ✅ Request succeeded', {
        timestamp,
        traceId,
        url: upstreamUrl,
        method: request.method,
        status: upstream.status,
        duration: requestDuration,
      });
    } catch (fetchError: any) {
      const requestDuration = Date.now() - requestStartTime;
      
// 增强错误日志，包含所有重试尝试的信息
// 修复：确保错误日志一定会输出
      console.error('[API Proxy] ❌ Fetch error (all attempts failed):', {
        timestamp,
        traceId,
        error: fetchError?.message,
        originalError: fetchError?.originalError?.message,
        url: upstreamUrl,
        method: request.method,
        name: fetchError?.name || fetchError?.originalError?.name,
        duration: requestDuration,
        attempts: fetchError?.allErrors?.length || 1,
        allErrors: fetchError?.allErrors || [{ error: fetchError?.message, attempt: 0 }],
        headers: Object.keys(headers),
        hasBody: !!body,
        bodySize: body ? (typeof body === 'string' ? body.length : 'FormData/Blob') : 0,
        stack: process.env.NODE_ENV === 'development' ? (fetchError?.stack || fetchError?.originalError?.stack) : undefined,
      });
      
// 提供更详细的错误信息
// 使用统一错误响应格式
// 修复：更准确地识别超时和连接错误
// 修复：检查所有错误尝试，更准确分类
      const errorMessage = fetchError?.message || fetchError?.originalError?.message || 'Unknown error';
      const allErrorMessages = [
        errorMessage,
        ...(fetchError?.allErrors?.map((e: any) => e.error) || []),
      ].join('; ');
      
// 改进错误分类：更准确地识别不同类型的错误
      const isTimeout = allErrorMessages.includes('timeout') || 
                        allErrorMessages.includes('AbortError') || 
                        allErrorMessages.includes('aborted') ||
                        fetchError?.name === 'AbortError' ||
                        fetchError?.originalError?.name === 'AbortError';
      
      // 网络连接错误：无法建立连接、DNS 解析失败、网络不可达等
      const isConnectionError = allErrorMessages.includes('ECONNREFUSED') || 
                                allErrorMessages.includes('ENOTFOUND') ||
                                allErrorMessages.includes('ECONNRESET') ||
                                allErrorMessages.includes('ETIMEDOUT') ||
                                allErrorMessages.includes('fetch failed') ||
                                allErrorMessages.includes('Failed to fetch') ||
                                allErrorMessages.includes('NetworkError') ||
                                allErrorMessages.includes('Network request failed') ||
                                allErrorMessages.includes('ERR_NETWORK') ||
                                allErrorMessages.includes('ERR_CONNECTION_REFUSED') ||
                                allErrorMessages.includes('ERR_CONNECTION_RESET') ||
                                allErrorMessages.includes('ERR_CONNECTION_TIMED_OUT') ||
                                (fetchError?.name === 'TypeError' && 
                                 (allErrorMessages.includes('fetch') || 
                                  allErrorMessages.includes('network'))) ||
                                (fetchError?.originalError?.name === 'TypeError' && 
                                 (allErrorMessages.includes('fetch') || 
                                  allErrorMessages.includes('network')));
      
      // 服务器错误：5xx 状态码、服务器内部错误等
      const isServerError = allErrorMessages.includes('500') ||
                            allErrorMessages.includes('Internal Server Error') ||
                            allErrorMessages.includes('UPSTREAM_500');
      
      // 根据错误类型选择错误码
      let errorCode: ErrorCode;
      if (isTimeout) {
        errorCode = ErrorCode.UPSTREAM_TIMEOUT;
      } else if (isConnectionError) {
        errorCode = ErrorCode.NETWORK_ERROR;
      } else if (isServerError) {
        errorCode = ErrorCode.UPSTREAM_500;
      } else {
        errorCode = ErrorCode.PROXY_ERROR;
      }
      
// 根据错误类型提供用户友好的错误消息
      let userMessage: string;
      if (isTimeout) {
        userMessage = '请求超时，请稍后重试';
      } else if (isConnectionError) {
        userMessage = '无法连接到后端服务器，请稍后重试';
      } else if (isServerError) {
        userMessage = '后端服务器错误，请稍后重试';
      } else {
        userMessage = '请求处理失败，请稍后重试';
      }
      
      const errorResponse = createErrorResponse(
        errorCode,
        userMessage,
        traceId,
// 修复：生产环境也提供基本错误信息，便于排查
        {
          url: upstreamUrl,
          error: errorMessage,
          path: backendPath,
          duration: requestDuration,
          attempts: fetchError?.allErrors?.length || 1,
          // 生产环境隐藏详细堆栈，但保留关键信息
          ...(process.env.NODE_ENV === 'development' ? { 
            stack: fetchError?.stack || fetchError?.originalError?.stack,
            allErrors: fetchError?.allErrors,
          } : {}),
        }
      );
      
      console.error('[API Proxy] ❌ Returning error response', {
        timestamp,
        traceId,
        errorCode,
        status: isTimeout ? 504 : 503,
        userMessage,
      });
      
      return NextResponse.json(
        errorResponse,
        { status: isTimeout ? 504 : 503 }
      );
    }
    
// 读取响应体
// 修复：添加响应体读取前的日志
    console.log('[API Proxy] 📖 Reading response body', {
      timestamp,
      traceId,
      status: upstream.status,
      contentType: upstream.headers.get('content-type'),
    });
    const responseBody = await upstream.text();
    const responseContentType = upstream.headers.get('content-type') || 'application/json';
    
// 增强响应日志
// 添加 traceId 到日志
    console.log('[API Proxy] 📥 Upstream Response', {
      timestamp,
      traceId,
      status: upstream.status,
      statusText: upstream.statusText,
      contentType: responseContentType,
      bodyLength: responseBody.length,
      hasSetCookie: !!upstream.headers.get('set-cookie'),
      setCookieHeaders: upstream.headers.getSetCookie?.() || [],
    });
    
// 创建响应头
    const responseHeaders = new Headers({
      'content-type': responseContentType,
    });
    
// 复制 Set-Cookie 头（这样浏览器可以保存认证 Cookie）
    const setCookieHeaders = upstream.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      console.log('[API Proxy] Setting cookies', {
        timestamp,
        cookieCount: setCookieHeaders.length
      });
// 修改 Cookie 的 domain，确保 Cookie 可以在前端域名下使用
      setCookieHeaders.forEach(cookie => {
        let modifiedCookie = cookie;
        // 如果 Cookie 包含 domain，移除它（让浏览器使用当前域名）
        if (modifiedCookie.includes('Domain=')) {
          // 移除 Domain=xxx 部分
          modifiedCookie = modifiedCookie.replace(/;\s*Domain=[^;]+/gi, '');
        }
        // 确保 SameSite=None 和 Secure=true（生产环境）
        if (process.env.NODE_ENV === 'production') {
          if (!modifiedCookie.includes('SameSite=None')) {
            modifiedCookie += '; SameSite=None';
          }
          if (!modifiedCookie.includes('Secure')) {
            modifiedCookie += '; Secure';
          }
        }
        responseHeaders.append('set-cookie', modifiedCookie);
      });
    } else {
      // 降级：使用 get('set-cookie')
      const setCookieHeader = upstream.headers.get('set-cookie');
      if (setCookieHeader) {
        console.log('[API Proxy] Setting cookie (fallback)', {
          timestamp,
          cookieLength: setCookieHeader.length
        });
        responseHeaders.set('set-cookie', setCookieHeader);
      }
    }
    
// 复制其他相关头
    const accessControlHeaders = [
      'access-control-expose-headers',
      'access-control-allow-credentials',
      'access-control-allow-origin',
    ];
    accessControlHeaders.forEach(headerName => {
      const headerValue = upstream.headers.get(headerName);
      if (headerValue) {
        responseHeaders.set(headerName, headerValue);
      }
    });
    
// 记录响应状态，增强错误日志
// 统一错误包装，添加 traceId
    if (!upstream.ok) {
// 尝试解析错误响应体，获取详细错误信息
      let errorDetails: any = null;
      try {
        if (responseContentType.includes('application/json')) {
          errorDetails = JSON.parse(responseBody);
        }
      } catch (e) {
        // 如果无法解析 JSON，使用原始文本
        errorDetails = { raw: responseBody.substring(0, 500) };
      }
      
      console.error('[API Proxy] ❌ Upstream Error', {
        timestamp,
        traceId,
        status: upstream.status,
        statusText: upstream.statusText,
        path: backendPath,
        upstreamUrl,
        hasToken,
        errorDetails: errorDetails || responseBody.substring(0, 500),
        bodyPreview: responseBody.substring(0, 500),
      });
      
// 统一错误包装：将上游错误转换为标准格式
      let errorCode: ErrorCode;
      if (upstream.status === 400) {
        errorCode = ErrorCode.VALIDATION_ERROR;
      } else if (upstream.status === 401) {
        errorCode = ErrorCode.UNAUTHORIZED;
      } else if (upstream.status === 403) {
        errorCode = ErrorCode.FORBIDDEN;
      } else if (upstream.status === 404) {
        errorCode = ErrorCode.NOT_FOUND;
      } else if (upstream.status === 409) {
        errorCode = ErrorCode.CONFLICT;
      } else if (upstream.status >= 500) {
        errorCode = ErrorCode.UPSTREAM_500;
      } else {
        errorCode = ErrorCode.UNKNOWN;
      }
      
      // 如果上游已经返回了标准错误格式，保留它；否则包装为标准格式
      let wrappedError: any;
      if (errorDetails && errorDetails.error && errorDetails.traceId) {
        // 上游已经返回标准格式，保留但确保 traceId 一致
        wrappedError = {
          ...errorDetails,
          traceId: errorDetails.traceId || traceId,
        };
      } else {
        // 包装为标准格式
        const errorMessage = errorDetails?.error || errorDetails?.message || upstream.statusText || 'Unknown error';
        wrappedError = createErrorResponse(
          errorCode,
          errorMessage,
          traceId,
          errorDetails?.details || errorDetails
        );
      }
      
      // 添加 traceId 到响应头
      responseHeaders.set('X-Trace-Id', traceId);
      responseHeaders.set('X-Request-Id', traceId);
      
      console.log('[API Proxy] 📤 Returning error response to client', {
        timestamp,
        traceId,
        status: upstream.status,
        errorCode,
        path: backendPath,
      });
      
      return NextResponse.json(
        wrappedError,
        {
          status: upstream.status,
          headers: responseHeaders,
        }
      );
    } else {
      console.log('[API Proxy] ✅ Upstream Success', {
        timestamp,
        traceId,
        bodyLength: responseBody.length,
        path: backendPath,
      });
      
// 成功响应也添加 traceId 到响应头
      responseHeaders.set('X-Trace-Id', traceId);
      responseHeaders.set('X-Request-Id', traceId);
    }
    
// 修复：添加最终响应返回日志
    console.log('[API Proxy] 📤 Returning success response to client', {
      timestamp,
      traceId,
      status: upstream.status,
      path: backendPath,
      bodyLength: responseBody.length,
      contentType: responseContentType,
    });
    
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
// 增强错误日志，记录完整的错误信息用于调试
    const errorTraceId = traceId || generateTraceId();
    const errorTimestamp = new Date().toISOString();
    
    console.error('[API Proxy] ❌ Proxy error (catch block):', {
      timestamp: errorTimestamp,
      traceId: errorTraceId,
      error: error?.message,
      errorName: error?.name,
      errorType: error?.constructor?.name,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      path: params?.path,
      pathType: typeof params?.path,
      pathIsArray: Array.isArray(params?.path),
      urlPath: request.nextUrl.pathname,
      method: request.method,
// 记录更多上下文信息
      hasParams: !!params,
      paramsKeys: params ? Object.keys(params) : [],
      originalError: error?.originalError?.message,
      allErrors: error?.allErrors,
    });
    
// 在生产环境也提供基本错误信息，便于排查
    const errorResponse = createErrorResponse(
      ErrorCode.PROXY_ERROR,
      '代理请求失败',
      errorTraceId,
      {
        error: error?.message || 'Unknown error',
        path: params?.path,
        method: request.method,
// 生产环境也提供错误类型，便于排查
        errorType: error?.name || error?.constructor?.name || 'Unknown',
        ...(process.env.NODE_ENV === 'development' ? {
          stack: error?.stack,
          pathType: typeof params?.path,
          originalError: error?.originalError?.message,
          allErrors: error?.allErrors,
        } : {}),
      }
    );
    
    return NextResponse.json(
      errorResponse,
      { 
        status: 500,
        headers: {
          'X-Trace-Id': errorTraceId,
          'X-Request-Id': errorTraceId,
        },
      }
    );
  }
}

// 导出所有 HTTP 方法处理器
// 修复：兼容 Next.js 14 和 15 的参数类型定义
// 修复：Next.js 14.2.33 使用同步对象，直接使用 { params: { path: string[] } }
// 注意：Next.js 15 使用 Promise，但当前版本是 14.2.33，使用同步对象
type RouteContext = {
  params: { path: string[] };
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
// 添加初始日志，确认路由被调用
  console.log('[API Proxy] GET handler called', {
    timestamp: new Date().toISOString(),
    url: request.nextUrl.pathname,
    params: context.params,
    path: context.params?.path,
  });
  return handleProxyRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  console.log('[API Proxy] POST handler called', {
    timestamp: new Date().toISOString(),
    url: request.nextUrl.pathname,
  });
  return handleProxyRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  return handleProxyRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  return handleProxyRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  return handleProxyRequest(request, context);
}

export async function HEAD(
  request: NextRequest,
  context: RouteContext
) {
  return handleProxyRequest(request, context);
}

export async function OPTIONS(
  request: NextRequest,
  context: RouteContext
) {
  return handleProxyRequest(request, context);
}

