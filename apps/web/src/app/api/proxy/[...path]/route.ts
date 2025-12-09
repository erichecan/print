/**
 * Next.js API Route: 通用 API 代理
 * [2025-12-02 04:15:00] 代理所有需要认证的后端 API 请求，确保 Cookie 正确传递
 * 
 * 使用方式：
 * - GET /api/proxy/orders?page=1&limit=100
 * - POST /api/proxy/admin/products
 * - 等等...
 */
import { NextRequest, NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/config/env';

// [2025-12-09] 修复：使用统一的环境变量配置模块
// [2025-12-09] 延迟获取 API_BASE，确保在运行时获取正确的环境变量
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy] Failed to get backend API base:', errorMessage);
    // [2025-12-09] 如果获取失败，在生产环境抛出错误，开发环境回退到 localhost
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
    return 'http://localhost:3001/api';
  }
}

// [2025-12-02 04:15:00] 需要认证的 API 路径前缀
const AUTH_REQUIRED_PATHS = [
  '/orders',
  '/admin',
  '/auth/me',
  '/addresses',
  '/designs',
  '/cart',
  '/sales', // [2025-12-07 05:30:00] Sales API 需要认证
];

/**
 * 检查路径是否需要认证
 */
function requiresAuth(path: string): boolean {
  return AUTH_REQUIRED_PATHS.some(prefix => path.startsWith(prefix));
}

/**
 * 处理所有 HTTP 方法的代理请求
 * [2025-12-08 05:30:00] 修复：兼容 Next.js 14 和 15 的参数类型
 * 注意：Next.js 14 使用同步对象，Next.js 15 使用 Promise
 */
async function handleProxyRequest(
  request: NextRequest,
  context: { params: { path: string[] } }
) {
  // [2025-12-08 05:45:00] 修复：Next.js 14.2.33 使用同步对象，直接使用 params
  const timestamp = new Date().toISOString();
  
  // [2025-12-08 05:35:00] 添加初始日志，确认函数被调用
  console.log('[API Proxy] handleProxyRequest called', {
    timestamp,
    url: request.nextUrl.pathname,
    method: request.method,
    params: context.params,
    path: context.params?.path,
  });
  
  let params: { path: string[] };
  try {
    // [2025-12-08 05:45:00] Next.js 14.2.33 使用同步对象，直接使用 params
    params = context.params;
    
    // [2025-12-08 05:30:00] 验证 params 结构
    if (!params || typeof params !== 'object' || !('path' in params)) {
      console.error('[API Proxy] ❌ Invalid params structure:', {
        timestamp,
        params,
        paramsType: typeof params,
        hasPath: 'path' in (params || {}),
      });
      throw new Error('Invalid params structure: missing path property');
    }
    
    // [2025-12-08 05:30:00] 增强日志：记录参数解析过程
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
    // [2025-12-02 04:15:00] 构建后端 API 路径
    // [2025-12-08 04:40:00] 修复：确保 path 存在且是数组
    // [2025-12-08 04:50:00] 增强：更健壮的路径解析
    let pathSegments: string[] = [];
    if (params?.path) {
      if (Array.isArray(params.path)) {
        pathSegments = params.path;
      } else if (typeof params.path === 'string') {
        pathSegments = [params.path];
      }
    }
    
    // [2025-12-08 04:50:00] 如果 pathSegments 为空，尝试从 URL 中提取
    if (pathSegments.length === 0) {
      const urlPath = request.nextUrl.pathname;
      const match = urlPath.match(/^\/api\/proxy\/(.+)$/);
      if (match && match[1]) {
        pathSegments = match[1].split('/').filter(Boolean);
      }
    }
    
    const backendPath = pathSegments.length > 0 ? `/${pathSegments.join('/')}` : '/';
    
    // [2025-12-08 04:50:00] 增强日志：记录路径解析过程
    console.log('[API Proxy] 📍 Path Resolution', {
      timestamp,
      originalParams: params?.path,
      pathSegments,
      backendPath,
      urlPath: request.nextUrl.pathname,
    });
    
    // [2025-12-02 04:15:00] 检查是否需要认证（可选，用于日志）
    const needsAuth = requiresAuth(backendPath);
    
    // [2025-12-02 04:15:00] 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${backendPath}?${queryString}` : backendPath;
    
    // [2025-12-09] 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
    // [2025-12-02 04:15:00] 构建后端 URL
    // [2025-12-08 04:55:00] 修复：API_BASE 已经包含 /api，直接拼接 backendPath
    // backendPath 已经以 / 开头（如 /cart, /sales/orders），所以直接拼接即可
    const upstreamUrl = `${API_BASE}${fullPath}`;
    
    // [2025-12-08 04:55:00] 增强日志：记录完整的 URL 构建过程
    console.log('[API Proxy] 🔗 URL Construction', {
      timestamp,
      API_BASE,
      backendPath,
      fullPath,
      upstreamUrl,
    });
    
    // [2025-12-07 07:55:00] 简化：直接从 Authorization header 读取 token（不再使用 Cookie）
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || null;
    const hasToken = !!token;
    
    // [2025-12-07 07:55:00] 简化日志输出
    console.log('[API Proxy] 🔍 Request Details', {
      timestamp,
      method: request.method,
      path: backendPath,
      needsAuth,
      hasToken,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      queryString: queryString || 'none',
    });
    
    // [2025-12-07 07:55:00] 准备请求头：只使用 Authorization header
    const headers: HeadersInit = {
      // [2025-12-07 07:55:00] 如果存在 token，添加到 Authorization header
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };
    
    // [2025-12-02 04:15:00] 复制其他请求头（排除一些不需要的）
    const excludeHeaders = ['host', 'connection', 'content-length', 'transfer-encoding', 'authorization'];
    request.headers.forEach((value, key) => {
      const lowerKey = key.toLowerCase();
      if (!excludeHeaders.includes(lowerKey) && lowerKey !== 'cookie') {
        headers[key] = value;
      }
    });
    
    // [2025-12-02 04:15:00] 准备请求体
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
    
    console.log('[API Proxy] Forwarding to upstream', {
      timestamp,
      url: upstreamUrl,
      method: request.method,
      hasToken,
      hasBody: !!body
    });
    
    // [2025-12-02 04:15:00] 转发请求到后端
    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        method: request.method,
        headers,
        body,
        cache: 'no-store',
      });
    } catch (fetchError: any) {
      console.error('[API Proxy] ❌ Fetch error:', {
        timestamp,
        error: fetchError?.message,
        url: upstreamUrl,
        name: fetchError?.name,
        stack: process.env.NODE_ENV === 'development' ? fetchError?.stack : undefined
      });
      
      // [2025-12-07 13:50:00] 提供更详细的错误信息
      const errorMessage = fetchError?.message || 'Unknown error';
      const isConnectionError = errorMessage.includes('ECONNREFUSED') || 
                                errorMessage.includes('fetch failed') ||
                                errorMessage.includes('Failed to fetch');
      
      return NextResponse.json(
        {
          error: isConnectionError 
            ? '无法连接到后端服务器' 
            : '后端服务器错误',
          message: isConnectionError 
            ? '请检查后端服务是否正在运行' 
            : errorMessage,
          details: process.env.NODE_ENV === 'development' ? {
            url: upstreamUrl,
            error: errorMessage,
            path: backendPath
          } : undefined,
        },
        { status: 503 }
      );
    }
    
    // [2025-12-02 04:15:00] 读取响应体
    const responseBody = await upstream.text();
    const responseContentType = upstream.headers.get('content-type') || 'application/json';
    
    // [2025-12-07 06:40:00] 增强响应日志
    console.log('[API Proxy] 📥 Upstream Response', {
      timestamp,
      status: upstream.status,
      statusText: upstream.statusText,
      contentType: responseContentType,
      bodyLength: responseBody.length,
      hasSetCookie: !!upstream.headers.get('set-cookie'),
      setCookieHeaders: upstream.headers.getSetCookie?.() || [],
    });
    
    // [2025-12-02 04:15:00] 创建响应头
    const responseHeaders = new Headers({
      'content-type': responseContentType,
    });
    
    // [2025-12-02 04:15:00] 复制 Set-Cookie 头（这样浏览器可以保存认证 Cookie）
    const setCookieHeaders = upstream.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      console.log('[API Proxy] Setting cookies', {
        timestamp,
        cookieCount: setCookieHeaders.length
      });
      // [2025-12-07 07:25:00] 修改 Cookie 的 domain，确保 Cookie 可以在前端域名下使用
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
    
    // [2025-12-02 04:15:00] 复制其他相关头
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
    
    // [2025-12-07 18:55:00] 记录响应状态，增强错误日志
    if (!upstream.ok) {
      // [2025-12-07 18:55:00] 尝试解析错误响应体，获取详细错误信息
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
        status: upstream.status,
        statusText: upstream.statusText,
        path: backendPath,
        upstreamUrl,
        hasToken,
        errorDetails: errorDetails || responseBody.substring(0, 500),
        bodyPreview: responseBody.substring(0, 500),
      });
    } else {
      console.log('[API Proxy] ✅ Upstream Success', {
        timestamp,
        bodyLength: responseBody.length,
        path: backendPath,
      });
    }
    
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[API Proxy] ❌ Proxy error:', {
      timestamp,
      error: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
      name: error?.name,
      path: params?.path,
      pathType: typeof params?.path,
      pathIsArray: Array.isArray(params?.path),
    });
    return NextResponse.json(
      {
        error: '代理请求失败',
        message: error?.message || '未知错误',
        details: process.env.NODE_ENV === 'development' ? {
          error: error?.message,
          stack: error?.stack,
          path: params?.path,
          pathType: typeof params?.path,
        } : undefined,
      },
      { status: 500 }
    );
  }
}

// [2025-12-02 04:15:00] 导出所有 HTTP 方法处理器
// [2025-12-08 05:30:00] 修复：兼容 Next.js 14 和 15 的参数类型定义
// [2025-12-08 05:45:00] 修复：Next.js 14.2.33 使用同步对象，直接使用 { params: { path: string[] } }
// 注意：Next.js 15 使用 Promise，但当前版本是 14.2.33，使用同步对象
type RouteContext = {
  params: { path: string[] };
};

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  // [2025-12-08 05:35:00] 添加初始日志，确认路由被调用
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

