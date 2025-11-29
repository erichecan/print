/**
 * Next.js API Route: GET /api/auth/me
 * [2025-01-29 02:15:00] 代理获取当前用户请求到后端，确保 Cookie 正确传递
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

export async function GET(request: Request) {
  try {
    // 获取前端请求的 cookies（包含认证 token）
    const cookies = request.headers.get('cookie') || '';

    // 转发请求到后端
    const upstreamUrl = `${API_BASE}/auth/me`;
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
      credentials: 'include',
      cache: 'no-store',
    });

    const responseBody = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    // 创建响应头
    const responseHeaders = new Headers({
      'content-type': contentType,
    });

    // 复制 Set-Cookie 头（如果有新的 Cookie 设置）
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

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Next.js API Route] Get user proxy error:', error);
    return NextResponse.json(
      {
        error: 'Failed to get current user',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

