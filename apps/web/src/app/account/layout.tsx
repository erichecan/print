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

export default async function AccountLayout({ children }: AccountLayoutProps) {
  // [2025-01-27 18:20:00] 获取 request ID 用于日志追踪
  const headersList = await headers();
  const requestId = headersList.get('x-request-id') || 
                   headersList.get('x-trace-id') || 
                   generateTraceId();
  const timestamp = new Date().toISOString();
  
  console.info('[AccountLayout] SSR start', { requestId, timestamp, path: '/account' });
  
  // [2025-01-27 18:20:00] 使用安全封装函数获取会话，不抛错
  const sessionResult = await getSessionSafe(requestId);
  
  if (!sessionResult.ok) {
    // [2025-01-27 18:20:00] 记录未登录或认证失败，但不抛错
    console.warn('[AccountLayout] Session check failed, redirecting to login', { 
      requestId, 
      timestamp,
      code: sessionResult.code,
      message: sessionResult.message
    });
    redirect('/login?redirect=/account');
  }
  
  // [2025-01-27 18:20:00] 会话获取成功，继续渲染
  console.info('[AccountLayout] Session valid, rendering layout', { 
    requestId, 
    timestamp,
    userId: sessionResult.data.userId
  });

  // [2025-01-27 18:45:00] 如果出现意外错误，上报并重定向
  try {
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
    // [2025-01-27 18:45:00] 捕获渲染期间的任何错误，上报并重定向
    console.error('[AccountLayout] Rendering error', {
      requestId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    reportServerError({
      traceId: requestId,
      route: '/account',
      message: error instanceof Error ? error.message : 'Layout rendering error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
    });
    
    // 重定向到登录页，避免显示 500
    redirect('/login?redirect=/account');
  }
} catch (error) {
    // [2025-01-27 18:45:00] 捕获渲染期间的任何错误，上报并重定向
    console.error('[AccountLayout] Rendering error', {
      requestId,
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    
    reportServerError({
      traceId: requestId,
      route: '/account',
      message: error instanceof Error ? error.message : 'Layout rendering error',
      error: {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
      },
    });
    
    // 重定向到登录页，避免显示 500
    redirect('/login?redirect=/account');
  }
}

