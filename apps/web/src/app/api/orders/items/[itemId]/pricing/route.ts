/**
 * [2025-12-19] 订单项定价计算API路由
 * POST: 计算报价，返回分项明细
 */
import { NextRequest, NextResponse } from 'next/server';
import { calcOrderItemPricing } from '@/lib/services/orderItemPricing';
import { OrderItemColorGroup } from '@/types/order';

export async function POST(
  request: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const body = await request.json();
    const { groups, currency = 'CAD' }: { groups: OrderItemColorGroup[]; currency?: 'CAD' | 'USD' } = body;
    
    if (!groups || !Array.isArray(groups)) {
      return NextResponse.json(
        { error: 'groups array is required' },
        { status: 400 }
      );
    }
    
    // [2025-12-19] 使用定价服务计算
    const result = calcOrderItemPricing(groups, currency);
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API] Error calculating pricing:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
