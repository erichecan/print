// 订单项颜色尺码覆盖 API 路由

import { NextRequest, NextResponse } from 'next/server';
import { validateSizeOverrides } from '@/lib/services/orderRules';
import { upsertItemColorSizeOverrides } from '@/lib/services/ordersRepo';

export async function POST(
  req: NextRequest,
  { params }: { params: { itemId: string; colorId: string } }
) {
  try {
    const body = await req.json();
    const overrides = body.overrides;
    
    if (!Array.isArray(overrides)) {
      return NextResponse.json(
        { errors: ['overrides must be an array'] },
        { status: 400 }
      );
    }
    
    const val = validateSizeOverrides(overrides);
    if (val.errors.length > 0) {
      return NextResponse.json({ errors: val.errors }, { status: 400 });
    }
    
    await upsertItemColorSizeOverrides(Number(params.colorId), overrides);
    
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API] Error upserting size overrides:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
