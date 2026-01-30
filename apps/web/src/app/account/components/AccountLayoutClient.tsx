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

  // Pro Max UI: Clean Layout with Tailwind
  return (
    <AccountProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <div className="flex-1 max-w-7xl mx-auto w-full flex items-start gap-8 pt-6 pb-12 px-4 sm:px-6 lg:px-8">

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden sticky top-6">
              <div className="p-4">
                <AccountSidebar />
              </div>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1 min-w-0">
            <div className="mb-6">
              <AccountBreadcrumb />
            </div>

            {children}
          </main>

        </div>
      </div>
    </AccountProvider>
  );
}

