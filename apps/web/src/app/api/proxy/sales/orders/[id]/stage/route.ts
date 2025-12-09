/**
 * Next.js API Route: PATCH /api/proxy/sales/orders/[id]/stage
 * [2025-12-09] 代理销售订单阶段更新请求到后端
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const orderId = params.id;

  try {
    const body = await request.json();

    // 构建后端 URL
    const upstreamUrl = `${API_BASE}/sales/orders/${orderId}/stage`;

    console.log('[API Proxy Sales Orders Stage] Proxying request', {
      timestamp,
      orderId,
      upstreamUrl,
      body,
    });

    // 转发请求到后端
    const response = await fetch(upstreamUrl, {
      method: 'PATCH',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const responseBody = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    console.log('[API Proxy Sales Orders Stage] Response', {
      timestamp,
      orderId,
      status: response.status,
      bodyLength: responseBody.length,
    });

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'content-type': contentType,
      },
    });
  } catch (error: any) {
    console.error('[API Proxy Sales Orders Stage] Error:', {
      timestamp,
      orderId,
      error: error?.message,
    });
    return NextResponse.json(
      {
        error: 'Failed to update order stage',
        message: '无法更新订单阶段，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

