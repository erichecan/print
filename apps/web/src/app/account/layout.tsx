/**
 * Account Layout
 * [2025-01-27 14:50:00] 账户页面布局，包含左侧导航栏、面包屑和登录守卫
 * [2025-01-27 18:20:00] 使用安全封装函数，避免抛错导致 500
 */
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getSessionSafe } from '@/server/account';
import { AccountSidebar } from './components/AccountSidebar';
import { AccountBreadcrumb } from './components/AccountBreadcrumb';
import { generateTraceId } from '@/shared/errors';
import { reportServerError } from '@/server/telemetry';

interface AccountLayoutProps {
  children: ReactNode;
}

/**
 * 检查是否是 Next.js redirect 错误
 * [2025-12-12 14:15:00] Next.js redirect() 通过抛出特殊错误实现重定向
 */
function isNextRedirectError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  // Next.js redirect 错误通常有特定的特征
  // 检查 error 对象是否有 digest 属性，且包含 NEXT_REDIRECT
  const errorObj = error as any;
  if (errorObj.digest && typeof errorObj.digest === 'string') {
    return errorObj.digest.includes('NEXT_REDIRECT') || 
           errorObj.digest.includes('redirect');
  }
  
  // 检查错误消息
  if (errorObj.message && typeof errorObj.message === 'string') {
    return errorObj.message.includes('NEXT_REDIRECT') ||
           errorObj.message.includes('redirect');
  }
  
  return false;
}

export default async function AccountLayout({ children }: AccountLayoutProps) {
  // [2025-12-12 14:15:00] 修复：将 redirect 移出 catch 块，避免 NEXT_REDIRECT 错误被捕获
  // [2025-01-27 19:05:00] 将整个函数体包装在 try-catch 中，捕获所有可能的错误
  try {
    // [2025-01-27 18:20:00] 获取 request ID 用于日志追踪
    let requestId: string;
    let timestamp: string;
    
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
    const sessionResult = await getSessionSafe(requestId);
    
    // [2025-12-12 14:15:00] 修复：在 try 块内处理未登录情况，直接 redirect（不在 catch 中）
    if (!sessionResult.ok) {
      // [2025-01-27 18:20:00] 记录未登录或认证失败，但不抛错
      console.warn('[AccountLayout] Session check failed, redirecting to login', { 
        requestId, 
        timestamp,
        code: sessionResult.code,
        message: sessionResult.message
      });
      // [2025-12-12 14:15:00] 在 try 块内调用 redirect，让 NEXT_REDIRECT 错误正常传播
      redirect('/login?redirect=/account');
    }
    
    // [2025-01-27 18:20:00] 会话获取成功，继续渲染
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
          {children}
        </main>
      </div>
    );
  } catch (error) {
    // [2025-12-12 14:15:00] 修复：检查是否是 NEXT_REDIRECT 错误，如果是则重新抛出，不捕获
    if (isNextRedirectError(error)) {
      console.info('[AccountLayout] NEXT_REDIRECT error detected, re-throwing to allow redirect', {
        error: error instanceof Error ? error.message : String(error),
      });
      // 重新抛出 redirect 错误，让 Next.js 正常处理重定向
      throw error;
    }
    
    // [2025-01-27 19:05:00] 捕获所有其他错误，包括 headers()、getSessionSafe() 和渲染期间的错误
    const errorRequestId = generateTraceId();
    const errorTimestamp = new Date().toISOString();
    
    console.error('[AccountLayout] Error caught (non-redirect)', {
      requestId: errorRequestId,
      timestamp: errorTimestamp,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : 'Unknown',
      // [2025-12-12 14:15:00] 添加 digest 信息用于追踪
      digest: (error as any)?.digest,
    });
    
    reportServerError({
      traceId: errorRequestId,
      route: '/account',
      message: error instanceof Error ? error.message : 'AccountLayout error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
      // [2025-12-12 14:15:00] 添加 digest 用于关联客户端错误
      digest: (error as any)?.digest,
    });
    
    // [2025-12-12 14:15:00] 修复：不在 catch 块中调用 redirect，而是抛出错误让错误边界处理
    // 错误边界会显示友好的错误页面，而不是尝试重定向（可能导致循环）
    throw error;
  }
}

