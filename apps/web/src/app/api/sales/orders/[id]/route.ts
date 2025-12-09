/**
 * Next.js API Route: GET /api/sales/orders/[id]
 * [2025-12-09] 代理销售订单详情请求到后端
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/config/env';

// [2025-12-09] 修复：使用统一的环境变量配置模块，延迟获取
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Sales Orders] Failed to get backend API base:', errorMessage);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
    return 'http://localhost:3001/api';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const orderId = params.id;

  try {
    // [2025-12-09] 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();
    
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

