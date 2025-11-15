/**
 * Layout Wrapper
 * [2025-11-15 12:35:00] 根据路径决定是否显示 header/footer
 */
'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ReactNode } from 'react';

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  // [2025-11-15 12:35:00] Admin 路径不显示前端页面的 header 和 footer
  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <SiteHeader />
      <main id="main">{children}</main>
      <SiteFooter />
    </>
  );
}

