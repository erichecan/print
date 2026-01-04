/**
 * Account Layout Client Wrapper
* Client Component wrapper，提供 AccountProvider
 */
'use client';

import { ReactNode } from 'react';
import { AccountProvider } from '@/contexts/AccountContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { AccountMobileNavbar } from './mobile/AccountMobileNavbar';
import { AccountSidebar } from './AccountSidebar';
import { AccountBreadcrumb } from './AccountBreadcrumb';

export function AccountLayoutClient({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <AccountProvider>
        <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
          <AccountMobileNavbar />
          <main style={{ padding: '16px' }}>
            {children}
          </main>
        </div>
      </AccountProvider>
    );
  }

  return (
    <AccountProvider>
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
    </AccountProvider>
  );
}

