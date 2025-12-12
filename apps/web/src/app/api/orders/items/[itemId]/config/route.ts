/**
 * [2025-12-19] 订单项配置API路由
 * GET: 读取颜色组、位置信息与override
 * POST: 保存颜色组与overrides
 */
import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api-config';

export async function GET(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;
    
    // [2025-12-19] 调用后端API获取配置
    const response = await fetch(`${API_BASE_URL}/orders/items/${itemId}/config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to fetch config' }));
      return NextResponse.json(
        { error: error.message || 'Failed to fetch config' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Error fetching order item config:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;
    const body = await request.json();
    
    // [2025-12-19] 调用后端API保存配置
    const response = await fetch(`${API_BASE_URL}/orders/items/${itemId}/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to save config' }));
      return NextResponse.json(
        { error: error.message || 'Failed to save config' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Error saving order item config:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
