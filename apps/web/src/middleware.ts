/**
 * Next.js Middleware
* 添加 request ID 和 trace ID 到请求头
 */
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { generateTraceId } from '@/shared/errors';

// Auth Guard Configuration
const PROTECTED_ROUTES = [
  '/account',
  '/orders',
  '/offline-orders', // Protect offline orders intake
];

const PUBLIC_ROUTES = [
  '/offline-orders/sales/login', // Login page for offline orders
  '/login',
  '/register',
  '/forgot-password',
];

export function middleware(request: NextRequest) {
  // 生成或使用现有的 request ID
  const existingRequestId = request.headers.get('x-request-id') ||
    request.headers.get('x-trace-id') ||
    generateTraceId();

  const response = NextResponse.next();

  // 添加 request ID 和 trace ID 到响应头
  response.headers.set('x-request-id', existingRequestId);
  response.headers.set('x-trace-id', existingRequestId);

  // Auth Check
  const { pathname } = request.nextUrl;
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some(route => pathname.startsWith(route));

  if (isProtectedRoute && !isPublicRoute) {
    const token = request.cookies.get('token');

    if (!token) {
      const loginUrl = new URL('/login', request.url);

      // Special redirection for offline orders
      if (pathname.startsWith('/offline-orders')) {
        loginUrl.pathname = '/offline-orders/sales/login';
      }

      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 增强可观测性：记录图片请求
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

  // 在开发环境记录请求信息
  if (process.env.NODE_ENV === 'development') {
    console.log('[Middleware] Request', {
      path: request.nextUrl.pathname,
      method: request.method,
      requestId: existingRequestId,
    });
  }

  return response;
}

// 匹配所有路由（包括 /account）
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
