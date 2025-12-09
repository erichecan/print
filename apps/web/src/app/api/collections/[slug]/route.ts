/**
 * Next.js API Route: Collections API 代理
 * [2025-12-09] 代理 /api/collections/[slug] 请求到后端
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
    console.error('[API Collections] Failed to get backend API base:', errorMessage);
    // [2025-12-09] 如果获取失败，在生产环境抛出错误，开发环境回退到 localhost
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
    return 'http://localhost:3001/api';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  const timestamp = new Date().toISOString();
  
  try {
    const { slug } = params;
    
    if (!slug) {
      console.warn('[API Collections] Missing slug', { timestamp });
      return NextResponse.json(
        { error: 'Collection slug is required' },
        { status: 400 }
      );
    }
    
    // [2025-12-09] 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
    // 构建后端 URL
    const upstreamUrl = `${API_BASE}/collections/${slug}`;
    
    console.log('[API Collections] Proxying request', {
      timestamp,
      slug,
      upstreamUrl
    });
    
    // 转发请求到后端
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    const responseBody = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';
    
    console.log('[API Collections] Response', {
      timestamp,
      slug,
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
    console.error('[API Collections] Error:', {
      timestamp,
      error: error?.message
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch collection',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

