/**
 * Next.js API Route: GET /api/offline-orders/config
 * [2025-12-07 04:35:00] 代理获取线下订单配置数据请求到后端
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/config/env';

// [2025-12-09] 修复：使用统一的环境变量配置模块，延迟获取
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Offline Orders Config] Failed to get backend API base:', errorMessage);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
    return 'http://localhost:3001/api';
  }
}

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    // [2025-12-09] 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
    // 构建后端 URL
    const upstreamUrl = `${API_BASE}/offline-orders/config`;
    
    console.log('[API Offline Orders Config] Proxying request', {
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
    
    console.log('[API Offline Orders Config] Response', {
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
    console.error('[API Offline Orders Config] Error:', {
      timestamp,
      error: error?.message
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch offline order config',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

