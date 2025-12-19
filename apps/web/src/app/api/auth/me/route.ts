/**
 * Next.js API Route: GET /api/auth/me
 * [2025-01-29 02:15:00] 代理获取当前用户请求到后端，确保 Cookie 正确传递
 * [2025-12-02 03:35:00] Enhanced Cookie handling and error logging
 * [2025-12-09] 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextRequest, NextResponse } from 'next/server';

import { getBackendApiBaseUrl } from '@/config/env';

// [2025-12-09] 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

// [2025-12-09] 修复：使用统一的环境变量配置模块
// [2025-12-09] 延迟获取 API_BASE，确保在运行时获取正确的环境变量
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Auth Me] Failed to get backend API base:', errorMessage);
    // [2025-12-09] 如果获取失败，在生产环境抛出错误，开发环境回退到 localhost
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
    // [2025-12-19 15:21:30] 修复：与本仓库默认本地后端端口 4000 对齐
    return 'http://localhost:4000/api';
  }
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    // [2025-12-09] 修复：同时支持 Cookie 和 Authorization header
    // 后端 authenticate 中间件会优先从 Cookie 读取 token，如果没有则从 Authorization header 读取
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '') || null;
    const cookieHeader = request.headers.get('cookie') || '';
    const hasToken = !!token;
    const hasCookie = !!cookieHeader;
    
    console.log('[Next.js API Route] Get user request', {
      timestamp,
      hasToken,
      hasCookie,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
      cookieKeys: cookieHeader ? cookieHeader.split(';').map(c => c.split('=')[0].trim()).filter(Boolean) : [],
    });

    // [2025-12-09] 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
    // [2025-12-02 03:35:00] 转发请求到后端
    const upstreamUrl = `${API_BASE}/auth/me`;
    console.log('[Next.js API Route] Forwarding to upstream', {
      timestamp,
      url: upstreamUrl,
      hasToken,
      hasCookie
    });

    // [2025-12-09] 修复：同时转发 Cookie 和 Authorization header
    // 后端 authenticate 中间件会优先从 Cookie 读取 token，如果没有则从 Authorization header 读取
    const upstreamHeaders: HeadersInit = {};
    if (cookieHeader) {
      upstreamHeaders['Cookie'] = cookieHeader;
    }
    if (token) {
      upstreamHeaders['Authorization'] = `Bearer ${token}`;
    }

    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: upstreamHeaders,
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

    // [2025-12-09] 修复：统一错误处理，401 返回结构化 JSON
    if (!upstream.ok) {
      console.error('[Next.js API Route] Upstream error', {
        timestamp,
        status: upstream.status,
        body: responseBody.substring(0, 200),
        hasToken,
        hasCookie
      });
      
      // [2025-12-09] 修复：401 错误返回结构化 JSON，便于前端处理
      if (upstream.status === 401) {
        let errorData: any;
        try {
          errorData = JSON.parse(responseBody);
        } catch {
          errorData = { error: 'Not authenticated', code: 'UNAUTHORIZED' };
        }
        return NextResponse.json(
          {
            error: errorData.error || 'Not authenticated',
            code: 'UNAUTHORIZED',
            message: 'Please login to access this resource',
          },
          { status: 401, headers: responseHeaders }
        );
      }
      
      // 其他错误：尝试解析 JSON，如果失败则返回原始文本
      let errorData: any;
      try {
        errorData = JSON.parse(responseBody);
      } catch {
        errorData = { error: responseBody || upstream.statusText };
      }
      return NextResponse.json(
        errorData,
        { status: upstream.status, headers: responseHeaders }
      );
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

