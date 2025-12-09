/**
 * Next.js API Route: GET /api/sales/orders/[id]
 * [2025-12-09] 代理销售订单详情请求到后端
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const orderId = params.id;

  try {
    // 构建后端 URL
    const upstreamUrl = `${API_BASE}/sales/orders/${orderId}`;

    console.log('[API Sales Orders] Proxying request', {
      timestamp,
      orderId,
      upstreamUrl,
    });

    // 转发请求到后端
    const response = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Cookie': request.headers.get('cookie') || '',
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      cache: 'no-store',
    });

    const responseBody = await response.text();
    const contentType = response.headers.get('content-type') || 'application/json';

    console.log('[API Sales Orders] Response', {
      timestamp,
      orderId,
      status: response.status,
      bodyLength: responseBody.length,
    });

    // 如果是 404，返回友好的错误信息
    if (response.status === 404) {
      return NextResponse.json(
        {
          error: 'Not Found',
          message: '订单不存在或已被删除',
          orderId,
        },
        { status: 404 }
      );
    }

    return new NextResponse(responseBody, {
      status: response.status,
      headers: {
        'content-type': contentType,
      },
    });
  } catch (error: any) {
    console.error('[API Sales Orders] Error:', {
      timestamp,
      orderId,
      error: error?.message,
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch order',
        message: '无法获取订单详情，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

