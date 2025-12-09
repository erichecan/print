/**
 * Design Lab Analytics Events API
 * [2025-12-08] 接收前端埋点事件
 * [2025-12-09] 修复：添加 dynamic 配置，防止构建时静态生成
 */
import { NextRequest, NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

// [2025-12-09] 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

const API_BASE = getBackendApiBase();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { events } = body;

    if (!Array.isArray(events)) {
      return NextResponse.json(
        { success: false, error: 'Events must be an array' },
        { status: 400 }
      );
    }

    // 转发到后端API
    const response = await fetch(`${API_BASE}/design-lab/analytics/events`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ events }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { success: false, error: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[Analytics API] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process analytics events',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

