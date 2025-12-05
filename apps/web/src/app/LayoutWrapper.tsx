/**
 * Layout Wrapper
 * [2025-11-15 12:35:00] 根据路径决定是否显示 header/footer
 * [2025-12-04 16:30:15] 在浏览器控制台打印前端构建版本（短 SHA + UTC 时间），便于部署验证
 */
'use client';

import { usePathname } from 'next/navigation';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';
import { ReactNode, useEffect } from 'react';

export default function LayoutWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');
  // [2025-12-02 04:40:00] offline-orders 独立流程：去掉全局头部和底部，只使用页面自身的布局
  const isOfflineOrdersFlow = pathname?.startsWith('/offline-orders');
  // [2025-01-30 21:40:00] Design Lab 是全屏应用，不显示全局 header/footer
  const isDesignLab = pathname === '/design-lab' || pathname?.startsWith('/design-lab/');

  // [2025-12-04 16:30:15] 在客户端 console 中打印当前前端构建版本信息，辅助排查线上是否为最新部署
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const sha = process.env.NEXT_PUBLIC_BUILD_SHA || 'unknown';
    const buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown';

    // 统一前缀，方便在 DevTools Console 中搜索
    // 示例: [Frontend Build] 336889c 2025-12-04T04:32:18Z
    // eslint-disable-next-line no-console
    console.log('[Frontend Build]', sha, buildTime);
  }, []);

  // [2025-11-15 12:35:00] Admin 路径不显示前端页面的 header 和 footer
  // [2025-12-02 04:40:00] Offline orders 流程同样不显示站点全局 header/footer
  // [2025-01-30 21:40:00] Design Lab 是全屏应用，不显示全局 header/footer
  if (isAdmin || isOfflineOrdersFlow || isDesignLab) {
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

