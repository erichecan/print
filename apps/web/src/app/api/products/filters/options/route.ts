/**
 * Next.js API Route: Products Filters Options API 代理
 * [2025-12-03 03:30:00] 代理 /api/products/filters/options 请求到后端
 * [2025-12-09] 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

// [2025-12-09] 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

const API_BASE = getBackendApiBase();

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    // 获取查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `/products/filters/options?${queryString}` : '/products/filters/options';
    
    // 构建后端 URL
    const upstreamUrl = `${API_BASE}${fullPath}`;
    
    console.log('[API Products Filters] Proxying request', {
      timestamp,
      upstreamUrl,
      queryString: queryString || 'none'
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
    
    console.log('[API Products Filters] Response', {
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
    console.error('[API Products Filters] Error:', {
      timestamp,
      error: error?.message
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch filter options',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

