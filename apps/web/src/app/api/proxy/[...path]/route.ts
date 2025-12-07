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

import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

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
 */
async function handleProxyRequest(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> | { path: string[] } }
) {
  // [2025-12-02 04:25:00] 处理 Next.js 15 的异步 params
  const params = await Promise.resolve(context.params);
  const timestamp = new Date().toISOString();
  
  try {
    // [2025-12-02 04:15:00] 构建后端 API 路径
    const pathSegments = params.path || [];
    const backendPath = `/${pathSegments.join('/')}`;
    
    // [2025-12-02 04:15:00] 检查是否需要认证（可选，用于日志）
    const needsAuth = requiresAuth(backendPath);
    
    // [2025-12-02 04:15:00] 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `${backendPath}?${queryString}` : backendPath;
    
    // [2025-12-02 04:15:00] 构建后端 URL
    const upstreamUrl = `${API_BASE}${fullPath}`;
    
    // [2025-12-02 04:15:00] 获取前端请求的 cookies（包含认证 token）
    const cookies = request.headers.get('cookie') || '';
    const hasCookies = !!cookies;
    const hasToken = cookies.includes('token=');
    
    console.log('[API Proxy] Request', {
      timestamp,
      method: request.method,
      path: backendPath,
      needsAuth,
      hasCookies,
      hasToken,
      queryString: queryString || 'none'
    });
    
    // [2025-12-02 04:15:00] 准备请求头
    const headers: HeadersInit = {
      ...(cookies ? { 'Cookie': cookies } : {}),
    };
    
    // [2025-12-02 04:15:00] 复制其他请求头（排除一些不需要的）
    const excludeHeaders = ['host', 'connection', 'content-length', 'transfer-encoding'];
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
      hasCookies,
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
        credentials: 'include',
        cache: 'no-store',
      });
    } catch (fetchError: any) {
      console.error('[API Proxy] Fetch error:', {
        timestamp,
        error: fetchError?.message,
        url: upstreamUrl,
        name: fetchError?.name
      });
      return NextResponse.json(
        {
          error: 'Failed to connect to backend server',
          details: process.env.NODE_ENV === 'development' ? fetchError?.message : undefined,
        },
        { status: 503 }
      );
    }
    
    // [2025-12-02 04:15:00] 读取响应体
    const responseBody = await upstream.text();
    const responseContentType = upstream.headers.get('content-type') || 'application/json';
    
    console.log('[API Proxy] Upstream response', {
      timestamp,
      status: upstream.status,
      statusText: upstream.statusText,
      hasSetCookie: !!upstream.headers.get('set-cookie'),
      contentType: responseContentType,
      bodyLength: responseBody.length
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
      setCookieHeaders.forEach(cookie => {
        responseHeaders.append('set-cookie', cookie);
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
    
    // [2025-12-02 04:15:00] 记录响应状态
    if (!upstream.ok) {
      console.error('[API Proxy] Upstream error', {
        timestamp,
        status: upstream.status,
        body: responseBody.substring(0, 200),
        path: backendPath
      });
    } else {
      console.log('[API Proxy] Upstream success', {
        timestamp,
        bodyLength: responseBody.length,
        path: backendPath
      });
    }
    
    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[API Proxy] Proxy error:', {
      timestamp,
      error: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json(
      {
        error: 'Failed to proxy request',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

// [2025-12-02 04:15:00] 导出所有 HTTP 方法处理器
export const GET = handleProxyRequest;
export const POST = handleProxyRequest;
export const PUT = handleProxyRequest;
export const PATCH = handleProxyRequest;
export const DELETE = handleProxyRequest;
export const HEAD = handleProxyRequest;
export const OPTIONS = handleProxyRequest;

