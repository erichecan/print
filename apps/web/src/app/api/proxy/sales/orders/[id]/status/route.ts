/**
 * Next.js API Route: PATCH /api/proxy/sales/orders/[id]/status
* 代理销售订单状态更新请求到后端
* 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBaseUrl } from '@/config/env';

// 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

// 修复：使用统一的环境变量配置模块，延迟获取
function getApiBase(): string {
  try {
    return getBackendApiBaseUrl();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[API Proxy Sales Orders Status] Failed to get backend API base:', errorMessage);
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`生产环境 API 配置错误: ${errorMessage}`);
    }
// 修复：与本仓库默认本地后端端口 4000 对齐（webapp-testing/Playwright/后端启动脚本）
    return 'http://localhost:3001/api';
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const timestamp = new Date().toISOString();
  const orderId = params.id;

  try {
    const body = await request.json();

// 修复：在运行时获取 API_BASE，确保使用最新的环境变量
    const API_BASE = getApiBase();

    // 构建后端 URL
    const upstreamUrl = `${API_BASE}/sales/orders/${orderId}/status`;

    console.log('[API Proxy Sales Orders Status] Proxying request', {
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

    console.log('[API Proxy Sales Orders Status] Response', {
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
    console.error('[API Proxy Sales Orders Status] Error:', {
      timestamp,
      orderId,
      error: error?.message,
    });
    return NextResponse.json(
      {
        error: 'Failed to update order status',
        message: '无法更新订单状态，请稍后重试',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

