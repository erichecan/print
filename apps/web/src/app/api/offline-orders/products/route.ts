/**
 * Next.js API Route: GET /api/offline-orders/products
 * [2025-01-27 15:30:00] 代理公开的产品列表请求到后端
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

export async function GET(request: NextRequest) {
  const timestamp = new Date().toISOString();
  
  try {
    // 构建后端 URL
    const upstreamUrl = `${API_BASE}/offline-orders/products`;
    
    console.log('[API Offline Orders Products] Proxying request', {
      timestamp,
      upstreamUrl
    });
    
    // 转发请求到后端（公开接口，无需认证）
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });
    
    const responseBody = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';
    
    console.log('[API Offline Orders Products] Response', {
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
    console.error('[API Offline Orders Products] Error:', {
      timestamp,
      error: error?.message
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch products',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

