/**
 * Next.js API Route: Content API 代理
 * [2025-12-03 03:30:00] 代理 /api/content 请求到后端
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
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

