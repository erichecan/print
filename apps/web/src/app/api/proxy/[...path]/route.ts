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
    
    // [2025-12-07 07:30:00] 从多个来源获取 token 和 cookies
    const cookieHeader = request.headers.get('cookie') || '';
    const cookieStore = request.cookies;
    const allCookies: string[] = [];
    let tokenFromCookie: string | null = null;
    
    // [2025-12-07 07:30:00] 从 cookieStore 获取所有 Cookie 和 token
    try {
      cookieStore.getAll().forEach((cookie) => {
        allCookies.push(`${cookie.name}=${cookie.value}`);
        // [2025-12-07 07:30:00] 特别提取 token
        if (cookie.name === 'token') {
          tokenFromCookie = cookie.value;
        }
      });
    } catch (e) {
      console.error('[API Proxy] ❌ Error reading cookies from cookieStore:', e);
    }
    
    // [2025-12-07 07:30:00] 也从 Cookie header 中尝试提取 token（备用）
    const tokenFromHeader = cookieHeader.match(/token=([^;]+)/)?.[1] || null;
    
    // [2025-12-07 07:30:00] 优先使用 cookieStore 中的 token，如果没有则使用 header 中的
    const token = tokenFromCookie || tokenFromHeader;
    
    // [2025-12-07 07:10:00] 优先使用 cookieStore，如果为空则使用 header
    // 但需要确保至少有一个来源有 Cookie
    const cookies = allCookies.length > 0 ? allCookies.join('; ') : cookieHeader;
    const hasCookies = !!cookies && cookies.length > 0 && cookies !== 'none';
    const hasToken = !!token;
    
    // [2025-12-07 06:40:00] 增强日志输出
    console.log('[API Proxy] 🔍 Request Details', {
      timestamp,
      method: request.method,
      path: backendPath,
      needsAuth,
      hasCookies,
      hasToken,
      tokenFromCookie: !!tokenFromCookie,
      tokenFromHeader: !!tokenFromHeader,
      cookieLength: cookies.length,
      cookiePreview: cookies.substring(0, 100), // 只显示前100字符
      cookieStoreCount: cookieStore.getAll().length,
      cookieStoreNames: cookieStore.getAll().map(c => c.name),
      cookieHeaderLength: cookieHeader.length,
      cookieHeaderPreview: cookieHeader.substring(0, 50),
      queryString: queryString || 'none',
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
    });
    
    // [2025-12-07 07:30:00] 准备请求头
    // 同时传递 Cookie 和 Authorization header（后端支持两种方式）
    const headers: HeadersInit = {
      ...(cookies ? { 'Cookie': cookies } : {}),
      // [2025-12-07 07:30:00] 如果找到 token，添加到 Authorization header（后端支持这种方式，更可靠）
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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
    
    // [2025-12-02 04:15:00] 记录响应状态
    if (!upstream.ok) {
      console.error('[API Proxy] ❌ Upstream Error', {
        timestamp,
        status: upstream.status,
        statusText: upstream.statusText,
        bodyPreview: responseBody.substring(0, 500), // 显示前500字符
        path: backendPath,
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

