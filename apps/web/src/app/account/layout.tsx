/**
 * Account Layout
 * [2025-01-27 14:50:00] 账户页面布局，包含左侧导航栏、面包屑和登录守卫
 */
import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { AccountSidebar } from './components/AccountSidebar';
import { AccountBreadcrumb } from './components/AccountBreadcrumb';

interface AccountLayoutProps {
  children: ReactNode;
}

export default async function AccountLayout({ children }: AccountLayoutProps) {
  // [2025-01-27 14:50:00] 服务端认证检查，未登录时重定向到登录页
  // [2025-01-27 17:25:00] 增强错误处理，避免因认证检查失败导致页面崩溃
  try {
    const session = await getSession();
    if (!session) {
      redirect('/login?redirect=/account');
    }
  } catch (error) {
    // [2025-01-27 17:25:00] 如果认证检查失败，记录错误并重定向到登录页
    console.error('[AccountLayout] Session check failed:', error);
    redirect('/login?redirect=/account');
  }

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
}

