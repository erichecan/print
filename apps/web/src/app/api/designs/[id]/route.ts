import { NextResponse } from 'next/server';

import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

// [2025-01-27 22:10:00] Next.js 14.2 App Router: params 是对象（不是 Promise）
type RouteParams = {
  params: {
    id: string;
  };
};

// [2025-01-27 22:10:00] GET /api/designs/:id - 获取设计草稿
export async function GET(_request: Request, { params }: RouteParams) {
  const timestamp = new Date().toISOString();
  // [2025-01-28 00:20:00] Next.js 15: params 可能是 Promise，需要 await
  const { id } = params instanceof Promise ? await params : params;

  console.log('[Next.js API Route] ========================================');
  console.log('[Next.js API Route] GET /api/designs/[id]');
  console.log('[Next.js API Route] Timestamp:', timestamp);
  console.log('[Next.js API Route] DesignId:', id);
  console.log('[Next.js API Route] API Base:', API_BASE);
  console.log('[Next.js API Route] Request URL:', _request.url);
  console.log('[Next.js API Route] ========================================');

  if (!id) {
    console.warn('[Next.js API Route] Missing designId', { timestamp });
    return NextResponse.json(
      { error: 'designId is required' },
      { status: 400 }
    );
  }

  try {
    const upstreamUrl = `${API_BASE}/designs/${id}`;
    console.log('[Next.js API Route] Fetching from upstream:', {
      url: upstreamUrl,
      timestamp
    });

    // [2025-01-27] 获取请求的cookies，传递给后端
    const cookies = _request.headers.get('cookie') || '';

    const startTime = performance.now();
    const upstream = await fetch(upstreamUrl, {
      method: 'GET',
      headers: {
        'Cookie': cookies,
      },
      credentials: 'include',
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

    // [2025-01-27] 传递后端的cookies到响应
    const responseHeaders = new Headers({
      'content-type': contentType,
    });
    
    // 复制Set-Cookie头
    const setCookieHeader = upstream.headers.get('set-cookie');
    if (setCookieHeader) {
      responseHeaders.set('set-cookie', setCookieHeader);
    }

    return new NextResponse(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Next.js API Route] Fetch error:', {
      error: error.message,
      stack: error.stack,
      id,
      timestamp
    });
    return NextResponse.json(
      {
        error: 'Failed to fetch design',
        details:
          process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

