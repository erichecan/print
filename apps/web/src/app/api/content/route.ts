/**
 * Next.js API Route: Content API 代理
* 代理 /api/content 请求到后端
* 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/config/env';

// 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

// 修复：使用统一的环境变量配置模块
// 延迟获取 API_BASE，确保在运行时获取正确的环境变量
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Content] Failed to get backend API base:', errorMessage);
// 如果获取失败，在生产环境抛出错误，开发环境回退到 localhost
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
// 修复：与本仓库默认本地后端端口 4000 对齐（webapp-testing/Playwright/后端启动脚本）
    return 'http://localhost:3001/api';
  }
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
// 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
    // 构建后端 URL
    const upstreamUrl = `${API_BASE}/content`;
    
    console.log('[API Content] Proxying request', {
      timestamp,
      upstreamUrl
    });
    
    // 转发请求到后端
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
      },
      credentials: 'include',
      cache: 'no-store',
    });
    
    const responseBody = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';
    
    console.log('[API Content] Response', {
      timestamp,
      status: response.status,
      bodyLength: responseBody.length
    });
    
    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'content-type': contentType,
      },
    });
  } catch (error: any) {
    console.error('[API Content] Error:', {
      timestamp,
      error: error?.message
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch content',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

