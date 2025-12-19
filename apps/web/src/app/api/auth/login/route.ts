/**
 * Next.js API Route: POST /api/auth/login
 * [2025-01-29 02:15:00] 代理登录请求到后端，确保 Cookie 正确传递
 * [2025-12-02 03:35:00] Enhanced Cookie handling and error logging
 * [2025-12-09] 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextRequest, NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/config/env';

// [2025-12-09] 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

// [2025-12-09] 修复：使用统一的环境变量配置模块，延迟获取
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Auth Login] Failed to get backend API base:', errorMessage);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
    // [2025-12-19 15:24:45] 修复：与本仓库默认本地后端端口 4000 对齐（webapp-testing/Playwright/后端启动脚本）
    return 'http://localhost:3001/api';
  }
}

export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  
  try {
    const body = await request.json();

    // [2025-12-02 03:35:00] 获取前端请求的 cookies（如果有）
    const cookies = request.headers.get('cookie') || '';
    const hasCookies = !!cookies;
    
    console.log('[Next.js API Route] Login request', {
      timestamp,
      hasCookies,
      cookieCount: cookies ? cookies.split(';').length : 0,
      email: body.email ? body.email.substring(0, 3) + '***' : 'missing'
    });

    // [2025-12-09] 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
    // [2025-12-02 03:35:00] 转发请求到后端
    const upstreamUrl = `${API_BASE}/auth/login`;
    console.log('[Next.js API Route] Forwarding to upstream', {
      timestamp,
      url: upstreamUrl,
      hasCookies
    });

    let upstream;
    try {
      upstream = await fetch(upstreamUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(cookies ? { 'Cookie': cookies } : {}), // [2025-12-02 03:35:00] 只在有 cookies 时设置
        },
        credentials: 'include',
        body: JSON.stringify(body),
        cache: 'no-store',
      });
    } catch (fetchError: any) {
      console.error('[Next.js API Route] Fetch error:', {
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

    const responseBody = await upstream.text();
    const contentType = upstream.headers.get('content-type') || 'application/json';

    console.log('[Next.js API Route] Upstream response', {
      timestamp,
      status: upstream.status,
      statusText: upstream.statusText,
      hasSetCookie: !!upstream.headers.get('set-cookie'),
      contentType,
      bodyPreview: responseBody.substring(0, 200)
    });

    // [2025-12-02 03:35:00] 创建响应头
    const responseHeaders = new Headers({
      'content-type': contentType,
    });

    // [2025-12-02 03:35:00] 复制 Set-Cookie 头（这样浏览器可以保存认证 Cookie）
    // Next.js 需要逐个设置 Set-Cookie 头
    const setCookieHeaders = upstream.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      console.log('[Next.js API Route] Setting cookies', {
        timestamp,
        cookieCount: setCookieHeaders.length
      });
      // [2025-12-07 07:25:00] 如果支持 getSetCookie()，使用它
      // 需要修改 Cookie 的 domain，确保 Cookie 可以在前端域名下使用
      setCookieHeaders.forEach(cookie => {
        // [2025-12-07 07:25:00] 修改 Cookie 的 domain，移除后端域名，使用前端域名
        // 或者不设置 domain，让浏览器自动使用当前域名
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
        console.log('[Next.js API Route] Setting cookie (fallback)', {
          timestamp,
          cookieLength: setCookieHeader.length
        });
        responseHeaders.set('set-cookie', setCookieHeader);
      } else {
        console.log('[Next.js API Route] No Set-Cookie header from upstream', { timestamp });
      }
    }

    // [2025-12-02 03:35:00] 复制其他相关头
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

    // [2025-12-02 03:35:00] 记录响应状态
    if (!upstream.ok) {
      console.error('[Next.js API Route] Upstream error', {
        timestamp,
        status: upstream.status,
        body: responseBody.substring(0, 200)
      });
    }

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Next.js API Route] Login proxy error:', {
      timestamp,
      error: error?.message,
      stack: error?.stack,
      name: error?.name
    });
    return NextResponse.json(
      {
        error: 'Failed to login',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

