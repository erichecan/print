// 订单项颜色配置 API 路由

import { NextRequest, NextResponse } from 'next/server';
import { validateColorConfigs } from '@/lib/services/orderRules';
import { upsertItemColors } from '@/lib/services/ordersRepo';

export async function POST(
  req: NextRequest,
  { params }: { params: { itemId: string } }
) {
  try {
    const body = await req.json();
    const colors = body.colors;
    
    if (!Array.isArray(colors)) {
      return NextResponse.json(
        { errors: ['colors must be an array'] },
        { status: 400 }
      );
    }
    
    const val = validateColorConfigs(colors);
    if (val.errors.length > 0) {
      return NextResponse.json({ errors: val.errors }, { status: 400 });
    }
    
    await upsertItemColors(params.itemId, colors);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API] Error upserting item colors:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
