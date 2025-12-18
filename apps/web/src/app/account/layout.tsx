/**
 * Account Layout
 * [2025-01-27 14:50:00] 账户页面布局，包含左侧导航栏、面包屑和登录守卫
 * [2025-01-27 18:20:00] 使用安全封装函数，避免抛错导致 500
 * [2025-01-30 19:15:00] 修复：添加 dynamic = 'force-dynamic' 标记，因为使用了 cookies() 和 headers()
 */
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSessionSafe } from '@/server/account';
import { AccountSidebar } from './components/AccountSidebar';
import { AccountBreadcrumb } from './components/AccountBreadcrumb';
import { AccountLayoutClient } from './components/AccountLayoutClient';
import { generateTraceId } from '@/shared/errors';
import { reportServerError } from '@/server/telemetry';

// [2025-01-30 19:15:00] 修复：强制动态渲染，因为使用了 cookies() 和 headers()
export const dynamic = 'force-dynamic';

interface AccountLayoutProps {
  children: ReactNode;
}

/**
 * 检查是否是 Next.js redirect 错误
 * [2025-12-13 14:40:00] 使用 Next.js 官方的 isRedirectError 函数
 * [2025-01-30 19:30:00] 修复：移除 require 调用，仅使用 digest 检查，避免生产环境模块加载问题
 */
function isNextRedirectError(error: unknown): boolean {
  // [2025-01-30 19:30:00] 修复：仅使用 digest 检查，避免在生产环境中使用 require 导致的问题
  // Next.js redirect 错误的 digest 格式：NEXT_REDIRECT;${type};${url};${statusCode};
  if (!error || typeof error !== 'object') return false;
  
  const errorObj = error as any;
  if (errorObj.digest && typeof errorObj.digest === 'string') {
    // 检查是否以 NEXT_REDIRECT 开头（精确匹配）
    return errorObj.digest.startsWith('NEXT_REDIRECT;');
  }
  
  return false;
}

export default async function AccountLayout({ children }: AccountLayoutProps) {
  // [2025-12-13 14:50:00] 修复：将 redirect 调用移出 try-catch，避免 NEXT_REDIRECT 错误被捕获
  // [2025-01-30 19:05:00] 增强：初始化变量，确保即使出错也有默认值
  let requestId: string = generateTraceId();
  let timestamp: string = new Date().toISOString();
  let sessionResult: Awaited<ReturnType<typeof getSessionSafe>>;
  
  try {
    // [2025-01-27 18:20:00] 获取 request ID 用于日志追踪
    try {
      const headersList = await headers();
      requestId = headersList.get('x-request-id') || 
                   headersList.get('x-trace-id') || 
                   generateTraceId();
      timestamp = new Date().toISOString();
    } catch (headerError) {
      // [2025-01-27 19:05:00] headers() 调用失败时，使用默认值
      requestId = generateTraceId();
      timestamp = new Date().toISOString();
      console.warn('[AccountLayout] Failed to get headers, using default requestId', {
        requestId,
        timestamp,
        error: headerError instanceof Error ? headerError.message : String(headerError)
      });
    }
    
    console.info('[AccountLayout] SSR start', { requestId, timestamp, path: '/account' });
    
    // [2025-01-27 18:20:00] 使用安全封装函数获取会话，不抛错
    // [2025-01-30 19:05:00] 增强：getSessionSafe 应该永远不会抛出错误，它总是返回 Result 类型
    sessionResult = await getSessionSafe(requestId);
  } catch (error) {
    // [2025-12-13 14:50:00] 捕获获取 session 过程中的错误（不包括 redirect）
    // [2025-01-30 19:05:00] 增强：虽然 getSessionSafe 不应该抛出错误，但为了安全起见，仍然捕获
    // 如果这是 redirect 错误，立即重新抛出
    if (isNextRedirectError(error)) {
      throw error; // 重新抛出 redirect 错误，让 Next.js 处理
    }
    
    // [2025-12-13 14:50:00] 记录其他错误并上报
    console.error('[AccountLayout] Error during session check', {
      requestId,
      timestamp,
      error: error instanceof Error ? error.message : String(error),
      stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : 'Unknown',
      digest: (error as any)?.digest,
    });
    
    reportServerError({
      traceId: requestId,
      route: '/account',
      message: error instanceof Error ? error.message : 'AccountLayout session check error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      digest: (error as any)?.digest,
    });
    
    // [2025-01-30 19:05:00] 增强：设置一个默认的 sessionResult 以便后续重定向到登录页
    sessionResult = { 
      ok: false, 
      code: 'UNKNOWN_ERROR', 
      message: error instanceof Error ? error.message : 'Unknown error during session check' 
    };
  }
  
  // [2025-12-13 14:50:00] 在 try-catch 外检查 sessionResult 并调用 redirect
  // 这样可以确保 redirect() 抛出的 NEXT_REDIRECT 错误不会被 catch 捕获
  if (!sessionResult.ok) {
    console.warn('[AccountLayout] Session check failed, redirecting to login', { 
      requestId, 
      timestamp,
      code: sessionResult.code,
      message: sessionResult.message
    });
    // [2025-12-13 14:50:00] redirect() 在 try-catch 外调用，确保 NEXT_REDIRECT 错误正常传播，不被捕获
    redirect('/login?redirect=/account');
  }
  
  // [2025-12-13 14:50:00] 会话获取成功，继续渲染（包装在 try-catch 中以防渲染错误）
  try {
    
    console.info('[AccountLayout] Session valid, rendering layout', { 
      requestId, 
      timestamp,
      userId: sessionResult.data.userId
    });

    // [2025-01-27 18:45:00] 渲染布局
    return (
      <div style={{
        display: 'flex', 
        minHeight: 'calc(100vh - 200px)', 
        backgroundColor: '#f5f5f5',
        paddingTop: '24px',
        paddingBottom: '48px'
      }}>
        {/* 左侧导航栏 */}
        <aside style={{
          width: '240px',
          backgroundColor: '#ffffff',
          borderRight: '1px solid #e0e0e0',
          padding: '24px 0',
          flexShrink: 0,
        }}>
          <AccountSidebar />
        </aside>

        {/* 主内容区域 */}
        <main style={{
          flex: 1,
          padding: '0 48px',
          maxWidth: '1200px',
          width: '100%',
        }}>
          <AccountBreadcrumb />
          {/* [2025-12-18 22:55:00] 使用 AccountProvider 包装子组件 */}
          <AccountLayoutClient>{children}</AccountLayoutClient>
        </main>
      </div>
    );
  } catch (error) {
    // [2025-12-13 14:45:00] 捕获渲染期间的错误
    // 如果是 redirect 错误，立即重新抛出
    if (isNextRedirectError(error)) {
      throw error; // 重新抛出 redirect 错误
    }
    
    // [2025-12-13 14:45:00] 记录渲染错误
    const errorRequestId = requestId || generateTraceId();
    const errorTimestamp = new Date().toISOString();
    
    console.error('[AccountLayout] Rendering error', {
      requestId: errorRequestId,
      timestamp: errorTimestamp,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : 'Unknown',
      digest: (error as any)?.digest,
    });
    
    reportServerError({
      traceId: errorRequestId,
      route: '/account',
      message: error instanceof Error ? error.message : 'AccountLayout rendering error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      digest: (error as any)?.digest,
    });
    
    // [2025-12-13 14:45:00] 渲染错误时抛出，让错误边界处理
    throw error;
  }
}

