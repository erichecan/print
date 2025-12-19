/**
 * Account Layout
 * [2025-01-27 14:50:00] 账户页面布局，包含左侧导航栏、面包屑和登录守卫
 * [2025-01-27 18:20:00] 使用安全封装函数，避免抛错导致 500
 * [2025-01-30 19:15:00] 修复：添加 dynamic = 'force-dynamic' 标记，因为使用了 cookies() 和 headers()
 * [2025-01-30 19:50:00] 修复：彻底移除渲染阶段的 try-catch，避免 Server Components 渲染错误
 */
import { ReactNode, Suspense } from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import dynamicImport from 'next/dynamic';
import { getSessionSafe } from '@/server/account';
import { AccountSidebar } from './components/AccountSidebar';
import { AccountBreadcrumb } from './components/AccountBreadcrumb';
import { generateTraceId } from '@/shared/errors';

// [2025-12-18 23:30:00] 使用 dynamic import 延迟加载 Client Component，避免服务端渲染错误
const AccountLayoutClient = dynamicImport(
  () => import('./components/AccountLayoutClient').then(mod => ({ default: mod.AccountLayoutClient })),
  { ssr: false }
);

// [2025-01-30 19:15:00] 修复：强制动态渲染，因为使用了 cookies() 和 headers()
export const dynamic = 'force-dynamic';

interface AccountLayoutProps {
  children: ReactNode;
}

export default async function AccountLayout({ children }: AccountLayoutProps) {
  // [2025-01-30 19:50:00] 修复：简化逻辑，移除不必要的 try-catch，确保 Server Components 渲染正常
  // [2025-01-30 19:05:00] 增强：初始化变量，确保即使出错也有默认值
  let requestId: string = generateTraceId();
  let timestamp: string = new Date().toISOString();
  
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
  const sessionResult = await getSessionSafe(requestId);
  
  // [2025-01-30 19:50:00] 修复：在 try-catch 外检查 sessionResult 并调用 redirect
  // 这样可以确保 redirect() 抛出的 NEXT_REDIRECT 错误正常传播，不被捕获
  if (!sessionResult.ok) {
    console.warn('[AccountLayout] Session check failed, redirecting to login', { 
      requestId, 
      timestamp,
      code: sessionResult.code,
      message: sessionResult.message
    });
    // redirect() 在 try-catch 外调用，确保 NEXT_REDIRECT 错误正常传播
    redirect('/login?redirect=/account');
  }
  
  // [2025-01-30 19:50:00] 修复：移除渲染阶段的 try-catch，让错误自然传播
  // Server Components 的错误应该由错误边界处理，而不是在这里捕获
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
        {/* [2025-12-18 23:30:00] 使用 Suspense 和 dynamic import 包装，避免服务端渲染错误 */}
        <Suspense fallback={<div style={{ padding: '48px', textAlign: 'center' }}>Loading...</div>}>
          <AccountLayoutClient>{children}</AccountLayoutClient>
        </Suspense>
      </main>
    </div>
  );
}

