/**
 * Next.js API Route: POST /api/auth/login
 * [2025-01-29 02:15:00] 代理登录请求到后端，确保 Cookie 正确传递
 */
import { NextResponse } from 'next/server';

const DEFAULT_API_BASE = 'http://localhost:3001/api';

function getBackendApiBase(): string {
  // 在生产环境中，使用环境变量中的后端 URL
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  // 开发环境默认
  return DEFAULT_API_BASE;
}

const API_BASE = getBackendApiBase();

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // 获取前端请求的 cookies（如果有）
    const cookies = request.headers.get('cookie') || '';

    // 转发请求到后端
    const upstreamUrl = `${API_BASE}/auth/login`;
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies, // 传递前端已有的 cookies
      },
      credentials: 'include',
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const responseBody = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    // 创建响应头
    const responseHeaders = new Headers({
      'content-type': contentType,
    });

    // 复制 Set-Cookie 头（这样浏览器可以保存认证 Cookie）
    // Next.js 需要逐个设置 Set-Cookie 头
    const setCookieHeaders = upstream.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      // 如果支持 getSetCookie()，使用它
      setCookieHeaders.forEach(cookie => {
        responseHeaders.append('set-cookie', cookie);
      });
    } else {
      // 降级：使用 get('set-cookie')
      const setCookieHeader = upstream.headers.get('set-cookie');
      if (setCookieHeader) {
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

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Next.js API Route] Login proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to login',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

