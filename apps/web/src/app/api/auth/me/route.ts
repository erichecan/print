/**
 * Next.js API Route: GET /api/auth/me
 * [2025-01-29 02:15:00] 代理获取当前用户请求到后端，确保 Cookie 正确传递
 * [2025-12-02 03:35:00] Enhanced Cookie handling and error logging
 */
import { NextResponse } from 'next/server';

import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

export async function GET(request: Request) {
  const timestamp = new Date().toISOString();
  
  try {
    // [2025-12-02 03:35:00] 获取前端请求的 cookies（包含认证 token）
    const cookies = request.headers.get('cookie') || '';
    const hasCookies = !!cookies;
    const hasToken = cookies.includes('token=');
    
    console.log('[Next.js API Route] Get user request', {
      timestamp,
      hasCookies,
      hasToken,
      cookieCount: cookies ? cookies.split(';').length : 0
    });

    // [2025-12-02 03:35:00] 转发请求到后端
    const upstreamUrl = `${API_BASE}/auth/me`;
    console.log('[Next.js API Route] Forwarding to upstream', {
      timestamp,
      url: upstreamUrl,
      hasCookies,
      hasToken
    });

    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        ...(cookies ? { 'Cookie': cookies } : {}), // [2025-12-02 03:35:00] 只在有 cookies 时设置
      },
      credentials: 'include',
      cache: 'no-store',
    });

    const responseBody = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    console.log('[Next.js API Route] Upstream response', {
      timestamp,
      status: upstream.status,
      statusText: upstream.statusText,
      hasSetCookie: !!upstream.headers.get('set-cookie'),
      contentType,
      bodyLength: responseBody.length
    });

    // [2025-12-02 03:35:00] 创建响应头
    const responseHeaders = new Headers({
      'content-type': contentType,
    });

    // [2025-12-02 03:35:00] 复制 Set-Cookie 头（如果有新的 Cookie 设置）
    // Next.js 需要逐个设置 Set-Cookie 头
    const setCookieHeaders = upstream.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      console.log('[Next.js API Route] Setting cookies', {
        timestamp,
        cookieCount: setCookieHeaders.length
      });
      // 如果支持 getSetCookie()，使用它
      setCookieHeaders.forEach(cookie => {
        responseHeaders.append('set-cookie', cookie);
      });
    } else {
      // 降级：使用 get('set-cookie')
      const setCookieHeader = upstream.headers.get('set-cookie');
      if (setCookieHeader) {
        console.log('[Next.js API Route] Setting cookie (fallback)', {
          timestamp,
          cookieLength: setCookieHeader.length
        });
        responseHeaders.set('set-cookie', setCookieHeader);
      }
    }

    // [2025-12-02 03:35:00] 记录响应状态
    if (!upstream.ok) {
      console.error('[Next.js API Route] Upstream error', {
        timestamp,
        status: upstream.status,
        body: responseBody.substring(0, 200),
        hasToken
      });
    } else {
      console.log('[Next.js API Route] Upstream success', {
        timestamp,
        bodyLength: responseBody.length
      });
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Next.js API Route] Get user proxy error:', {
      timestamp,
      error: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json(
      {
        error: 'Failed to get current user',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

