/**
 * Image Proxy API Route
 * [2025-01-27 19:15:00] 服务器端图片代理，用于绕过防盗链和统一缓存
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateTraceId } from '@/shared/errors';

/**
 * GET /api/image-proxy
 * [2025-01-27 19:15:00] 代理外部图片，添加缓存头和错误处理
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const src = searchParams.get('src');
  const requestId = request.headers.get('x-request-id') || 
                   request.headers.get('x-trace-id') || 
                   generateTraceId();
  const timestamp = new Date().toISOString();

  // [2025-01-27 19:15:00] 验证 src 参数
  if (!src || !/^https?:\/\//.test(src)) {
    console.warn('[Image Proxy] Invalid src parameter', { 
      requestId, 
      timestamp,
      src: src?.substring(0, 100) 
    });
    return NextResponse.json(
      { error: 'Bad src parameter. Must be a valid HTTP/HTTPS URL.' },
      { status: 400 }
    );
  }

  // [2025-01-27 19:15:00] 白名单检查（可选，增强安全性）
  const allowedDomains = [
    'storage.googleapis.com',
    'print-main-product-images',
    'mms-images-prod.imgix.net',
    'images.unsplash.com',
    'picsum.photos',
  ];
  
  try {
    const url = new URL(src);
    const isAllowed = allowedDomains.some(domain => url.hostname.includes(domain));
    
    if (!isAllowed) {
      console.warn('[Image Proxy] Domain not in whitelist', { 
        requestId, 
        timestamp,
        hostname: url.hostname 
      });
      return NextResponse.json(
        { error: 'Domain not allowed' },
        { status: 403 }
      );
    }
  } catch (urlError) {
    console.error('[Image Proxy] Invalid URL', { 
      requestId, 
      timestamp,
      error: urlError instanceof Error ? urlError.message : String(urlError)
    });
    return NextResponse.json(
      { error: 'Invalid URL format' },
      { status: 400 }
    );
  }

  try {
    // [2025-01-27 19:15:00] 从上游获取图片
    const response = await fetch(src, {
      headers: {
        'User-Agent': 'PrintMain/1.0',
        'Accept': 'image/*',
        'X-Request-Id': requestId,
        'X-Trace-Id': requestId,
      },
      // [2025-01-27 19:15:00] 设置超时（10秒）
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error('[Image Proxy] Upstream error', { 
        requestId, 
        timestamp,
        status: response.status,
        statusText: response.statusText,
        src: src.substring(0, 100)
      });
      return NextResponse.json(
        { error: 'Upstream error', status: response.status },
        { status: response.status >= 500 ? 502 : response.status }
      );
    }

    // [2025-01-27 19:15:00] 读取图片数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // [2025-01-27 19:15:00] 获取内容类型
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // [2025-01-27 19:15:00] 设置响应头
    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    headers.set('X-Request-Id', requestId);
    headers.set('X-Trace-Id', requestId);
    
    // [2025-01-27 19:15:00] 复制上游的缓存相关头（如果有）
    const upstreamCacheControl = response.headers.get('cache-control');
    if (upstreamCacheControl) {
      headers.set('X-Upstream-Cache-Control', upstreamCacheControl);
    }

    console.info('[Image Proxy] Success', { 
      requestId, 
      timestamp,
      src: src.substring(0, 100),
      contentType,
      size: buffer.length
    });

    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[Image Proxy] Fetch failed', {
      requestId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      src: src.substring(0, 100)
    });

    // [2025-01-27 19:15:00] 返回错误响应
    return NextResponse.json(
      { 
        error: 'Proxy failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
