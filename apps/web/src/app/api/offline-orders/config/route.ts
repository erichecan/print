/**
 * Next.js API Route: GET /api/offline-orders/config
 * [2025-12-07 04:35:00] 代理获取线下订单配置数据请求到后端
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
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

