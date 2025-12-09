import { NextResponse } from 'next/server';

import { getBackendApiBase } from '@/lib/api-route-config';

// [2025-12-09] 修复：强制动态路由，防止构建时静态生成
export const dynamic = 'force-dynamic';

const API_BASE = getBackendApiBase();

// [2025-01-27 22:10:00] Next.js 14.2 App Router: params 是对象（不是 Promise）
type RouteParams = {
  params: {
    variantId: string;
  };
};

// [2025-01-27 21:55:00] 添加详细日志用于调试
export async function GET(_request: Request, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  // [2025-01-28 00:20:00] Next.js 15: params 可能是 Promise，需要 await
  const { variantId } = params instanceof Promise ? await params : params;

  console.log('[Next.js API Route] ========================================');
  console.log('[Next.js API Route] GET /api/products/variant/[variantId]');
  console.log('[Next.js API Route] Timestamp:', timestamp);
  console.log('[Next.js API Route] VariantId:', variantId);
  console.log('[Next.js API Route] API Base:', API_BASE);
  console.log('[Next.js API Route] Request URL:', _request.url);
  console.log('[Next.js API Route] ========================================');

  if (!variantId) {
    console.warn('[Next.js API Route] Missing variantId', { timestamp });
    return NextResponse.json(
      { error: 'variantId is required' },
      { status: 400 }
    );
  }

  try {
    const upstreamUrl = `${API_BASE}/products/variant/${variantId}`;
    console.log('[Next.js API Route] Fetching from upstream:', {
      url: upstreamUrl,
      timestamp
    });

    const startTime = performance.now();
    const upstream = await fetch(upstreamUrl, {
      // Design Lab payload 应该始终获取最新商品图，禁用缓存
      cache: 'no-store',
    });
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    console.log('[Next.js API Route] Upstream response:', {
      status: upstream.status,
      statusText: upstream.statusText,
      ok: upstream.ok,
      duration: `${duration}ms`,
      contentType: upstream.headers.get('content-type'),
      timestamp
    });

    const body = await upstream.text();
    const contentType =
      upstream.headers.get('content-type') || 'application/json';

    if (!upstream.ok) {
      console.error('[Next.js API Route] Upstream error:', {
        status: upstream.status,
        body: body.substring(0, 200),
        timestamp
      });
    } else {
      console.log('[Next.js API Route] Upstream success:', {
        bodyLength: body.length,
        timestamp
      });
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: {
        'content-type': contentType,
      },
    });
  } catch (error: any) {
    console.error('[Next.js API Route] Fetch error:', {
      error: error.message,
      stack: error.stack,
      variantId,
      timestamp
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch product by variantId',
        details:
          process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

