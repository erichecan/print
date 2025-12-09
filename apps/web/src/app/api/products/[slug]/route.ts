/**
 * Next.js API Route: Product Detail API 代理
 * [2025-12-03 04:20:00] 代理 /api/products/:slug 请求到后端
 * 支持同时使用 slug 或数字 ID（后端已支持）
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/config/env';

// [2025-12-09] 修复：使用统一的环境变量配置模块
// [2025-12-09] 延迟获取 API_BASE，确保在运行时获取正确的环境变量
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Products Detail] Failed to get backend API base:', errorMessage);
    // [2025-12-09] 如果获取失败，在生产环境抛出错误，开发环境回退到 localhost
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
    return 'http://localhost:3001/api';
  }
}

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
      console.warn('[API Products Detail] Missing slug', { timestamp });
      return NextResponse.json(
        { error: 'Product slug is required' },
        { status: 400 }
      );
    }
    
    // 获取查询参数（如果有）
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const fullPath = queryString ? `/products/${slug}?${queryString}` : `/products/${slug}`;
    
    // [2025-12-09] 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
    // 构建后端 URL
    const upstreamUrl = `${API_BASE}${fullPath}`;
    
    console.log('[API Products Detail] Proxying request', {
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
    
    console.log('[API Products Detail] Response', {
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
    console.error('[API Products Detail] Error:', {
      timestamp,
      error: error?.message,
      stack: error?.stack
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

