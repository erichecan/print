/**
 * Image Proxy API Route
 * [2025-01-27 19:15:00] 服务器端图片代理，用于绕过防盗链和统一缓存
 */
import { NextRequest, NextResponse } from 'next/server';
import { generateTraceId } from '@/shared/errors';

/**
 * OPTIONS /api/image-proxy
 * [2025-01-30 19:00:00] 处理 CORS 预检请求
 */
export async function OPTIONS(request: NextRequest) {
  const headers = new Headers();
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id, X-Trace-Id');
  return new NextResponse(null, { status: 204, headers });
}

/**
 * GET /api/image-proxy
 * [2025-01-27 19:15:00] 代理外部图片，添加缓存头和错误处理
 * [2025-01-30 19:00:00] 增强：添加 CORS 支持、改进错误处理
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const src = searchParams.get('src');
  const requestId = request.headers.get('x-request-id') || 
                   request.headers.get('x-trace-id') || 
                   generateTraceId();
  const timestamp = new Date().toISOString();

  // [2025-01-30 19:00:00] 添加 CORS 头，确保浏览器可以访问错误响应
  const corsHeaders = new Headers();
  corsHeaders.set('Access-Control-Allow-Origin', '*');
  corsHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  corsHeaders.set('Access-Control-Allow-Headers', 'Content-Type, X-Request-Id, X-Trace-Id');
  corsHeaders.set('X-Request-Id', requestId);
  corsHeaders.set('X-Trace-Id', requestId);

  // [2025-01-27 19:15:00] 验证 src 参数
  if (!src || !/^https?:\/\//.test(src)) {
    console.warn('[Image Proxy] Invalid src parameter', { 
      requestId, 
      timestamp,
      src: src?.substring(0, 100) 
    });
    return NextResponse.json(
      { error: 'Bad src parameter. Must be a valid HTTP/HTTPS URL.' },
      { status: 400, headers: corsHeaders }
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
        { status: 403, headers: corsHeaders }
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
      { status: 400, headers: corsHeaders }
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
      // [2025-01-30 19:00:00] 添加详细的错误信息，包括原始 URL
      return NextResponse.json(
        { 
          error: 'Upstream error', 
          status: response.status,
          message: `Failed to fetch image from upstream: ${response.statusText}`,
          src: src.substring(0, 100)
        },
        { 
          status: response.status >= 500 ? 502 : response.status,
          headers: corsHeaders
        }
      );
    }

    // [2025-01-27 19:15:00] 读取图片数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // [2025-01-27 19:15:00] 获取内容类型
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // [2025-01-27 19:15:00] 设置响应头
    // [2025-01-30 19:00:00] 添加 CORS 头，确保浏览器可以访问
    const headers = new Headers(corsHeaders);
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
    
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
    // [2025-01-30 19:00:00] 添加 CORS 头和详细错误信息
    return NextResponse.json(
      { 
        error: 'Proxy failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        src: src.substring(0, 100)
      },
      { 
        status: 502,
        headers: corsHeaders
      }
    );
  }
}
