/**
 * Next.js API Route: Related Products API 代理
 * [2025-12-03 04:20:00] 代理 /api/products/:slug/related 请求到后端
 * 支持查询参数 ?limit=8
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

// [2025-12-03 04:20:00] Next.js 15: params 可能是 Promise
type RouteParams = {
  params: Promise<{ slug: string }> | { slug: string };
};

export async function GET(request: NextRequest, context: RouteParams) {
  const timestamp = new Date().toISOString();
  
  try {
    // [2025-12-03 04:20:00] 处理 Next.js 15 的异步 params
    const params = await Promise.resolve(context.params);
    const { slug } = params;
    
    if (!slug) {
      console.warn('[API Products Related] Missing slug', { timestamp });
      return NextResponse.json(
        { error: 'Product slug is required' },
        { status: 400 }
      );
    }
    
    // 获取查询参数（limit 等）
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `/products/${slug}/related?${queryString}` : `/products/${slug}/related`;
    
    // 构建后端 URL
    const upstreamUrl = `${API_BASE}${fullPath}`;
    
    console.log('[API Products Related] Proxying request', {
      timestamp,
      slug,
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
    
    console.log('[API Products Related] Response', {
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
    console.error('[API Products Related] Error:', {
      timestamp,
      error: error?.message,
      stack: error?.stack
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch related products',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

