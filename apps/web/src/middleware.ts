/**
 * Next.js Middleware
 * [2025-01-27 18:15:00] 添加 request ID 和 trace ID 到请求头
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateTraceId } from '@/shared/errors';

export function middleware(request: NextRequest) {
  // [2025-01-27 18:15:00] 生成或使用现有的 request ID
  const existingRequestId = request.headers.get('x-request-id') || 
                           request.headers.get('x-trace-id') ||
                           generateTraceId();
  
  const response = NextResponse.next();
  
  // [2025-01-27 18:15:00] 添加 request ID 和 trace ID 到响应头
  response.headers.set('x-request-id', existingRequestId);
  response.headers.set('x-trace-id', existingRequestId);
  
  // [2025-01-27 19:30:00] 增强可观测性：记录图片请求
  if (request.nextUrl.pathname.startsWith('/_next/image')) {
    const src = request.nextUrl.searchParams.get('url');
    if (src) {
      console.info('[Middleware] Image request', {
        requestId: existingRequestId,
        path: request.nextUrl.pathname,
        src: src.substring(0, 100), // 只记录前100个字符
        timestamp: new Date().toISOString(),
      });
    }
  }
  
  // [2025-01-27 18:15:00] 在开发环境记录请求信息
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Request', {
      path: request.nextUrl.pathname,
      method: request.method,
      requestId: existingRequestId,
    });
  }
  
  return response;
}

// [2025-01-27 18:15:00] 匹配所有路由（包括 /account）
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
