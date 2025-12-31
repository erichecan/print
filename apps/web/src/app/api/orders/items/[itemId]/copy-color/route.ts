/**
* 颜色配置复制API路由
 * POST: 将源颜色的印刷位置配置复制到目标颜色
 */
import { NextRequest, NextResponse } from 'next/server';
import { API_BASE_URL } from '@/lib/api-config';

export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const { itemId } = params;
    const { fromColorId, toColorId } = await request.json();
    
    if (!fromColorId || !toColorId) {
      return NextResponse.json(
        { error: 'fromColorId and toColorId are required' },
        { status: 400 }
      );
    }
    
// 调用后端API复制颜色配置
    const response = await fetch(
      `${API_BASE_URL}/orders/items/${itemId}/copy-color/${fromColorId}/${toColorId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to copy color config' }));
      return NextResponse.json(
        { error: error.message || 'Failed to copy color config' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[API] Error copying color config:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
