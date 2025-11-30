import { NextResponse } from 'next/server';
import { getBackendApiBase } from '@/lib/api-route-config';

const API_BASE = getBackendApiBase();

// [2025-01-27 22:10:00] POST /api/designs - 创建设计草稿
export async function POST(request: Request) {
  const timestamp = new Date().toISOString();
  
  console.log('[Next.js API Route] ========================================');
  console.log('[Next.js API Route] POST /api/designs');
  console.log('[Next.js API Route] Timestamp:', timestamp);
  console.log('[Next.js API Route] API Base:', API_BASE);
  console.log('[Next.js API Route] Request URL:', request.url);
  console.log('[Next.js API Route] ========================================');

  try {
    const body = await request.json();
    console.log('[Next.js API Route] Request body:', {
      hasProductVariantId: !!body.productVariantId,
      hasName: !!body.name,
      hasCanvas: !!body.canvas,
      timestamp
    });

    const upstreamUrl = `${API_BASE}/designs`;
    console.log('[Next.js API Route] Fetching from upstream:', {
      url: upstreamUrl,
      timestamp
    });

    // [2025-01-27] 获取请求的cookies，传递给后端
    const cookies = request.headers.get('cookie') || '';
    
    const startTime = performance.now();
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookies,
      },
      credentials: 'include',
      body: JSON.stringify(body),
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

    const responseBody = await upstream.text();
    const contentType =
      upstream.headers.get('content-type') || 'application/json';

    if (!upstream.ok) {
      console.error('[Next.js API Route] Upstream error:', {
        status: upstream.status,
        body: responseBody.substring(0, 200),
        timestamp
      });
    } else {
      console.log('[Next.js API Route] Upstream success:', {
        bodyLength: responseBody.length,
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

    return new NextResponse(responseBody, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error: any) {
    console.error('[Next.js API Route] Fetch error:', {
      error: error.message,
      stack: error.stack,
      timestamp
    });
    return NextResponse.json(
      {
        error: 'Failed to create design',
        details:
          process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    );
  }
}

