// [2025-01-31 19:50:00] 价格估算 API 路由

import { NextRequest, NextResponse } from 'next/server';
import { estimateOrderItemPricing } from '@/lib/services/orderPricing';
import { validatePrintFeasibility } from '@/lib/services/orderRules';
import type { OrderItemPayload } from '@/types/order';

export async function POST(req: NextRequest) {
  try {
    const payload: OrderItemPayload = await req.json();
    
    const validation = validatePrintFeasibility(payload);
    const pricing = estimateOrderItemPricing(payload);
    
    return NextResponse.json({ validation, pricing });
  } catch (error) {
    console.error('[API] Error estimating pricing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
