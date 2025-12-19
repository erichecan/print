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
  // [2025-12-18 17:50:00] 增强版本信息显示，添加更详细的日志
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // [2025-12-19 15:02:45] 版本信息读取策略：优先 NEXT_PUBLIC_BUILD_*；兼容旧变量 NEXT_PUBLIC_GIT_SHA；避免生产环境出现 unknown 导致无法验证部署
    let sha = process.env.NEXT_PUBLIC_BUILD_SHA || process.env.NEXT_PUBLIC_GIT_SHA || 'unknown';
    let buildTime = process.env.NEXT_PUBLIC_BUILD_TIME || 'unknown';
    const currentTime = new Date().toISOString();

    const isProd = process.env.NODE_ENV === 'production';
    const isMissing = sha === 'unknown' || buildTime === 'unknown';

    // [2025-12-19 15:39:10] 修复：生产环境不再先打印 unknown，避免误判“部署没生效”
    // 若缺失则先请求 /api/version 拿到确定版本，再打印一次最终版本信息（目标：SHA 永远非 unknown/dev）。
    if (isProd && isMissing) {
      (async () => {
        try {
          const resp = await fetch('/api/version', { method: 'GET', cache: 'no-store' });
          if (!resp.ok) throw new Error(`Version API non-OK: ${resp.status}`);
          const data = await resp.json().catch(() => ({} as any));
          const resolvedSha = (data?.sha || data?.gitSha || data?.buildSha || '').toString().trim();
          const resolvedTime = (data?.buildTime || data?.utcTime || '').toString().trim();

          if (resolvedSha) sha = resolvedSha;
          if (resolvedTime) buildTime = resolvedTime;

          // eslint-disable-next-line no-console
          console.log('[Frontend Build]', sha, buildTime);
          // eslint-disable-next-line no-console
          console.log('[Frontend Build Info]', {
            buildSha: sha,
            buildTime: buildTime,
            currentTime: currentTime,
            url: window.location.href,
            userAgent: navigator.userAgent.substring(0, 50) + '...',
            source: 'api/version',
          });
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[Frontend Build] ⚠️ 构建版本信息未找到（/api/version fallback 也失败），请检查构建/部署配置');
        }
      })();
      return;
    }

    // 统一前缀，方便在 DevTools Console 中搜索
    // 示例: [Frontend Build] 336889c 2025-12-04T04:32:18Z
    // eslint-disable-next-line no-console
    console.log('[Frontend Build]', sha, buildTime);
    // [2025-12-18 17:50:00] 添加更详细的版本信息，包括当前时间，便于判断是否为最新部署
    // eslint-disable-next-line no-console
    console.log('[Frontend Build Info]', {
      buildSha: sha,
      buildTime: buildTime,
      currentTime: currentTime,
      url: window.location.href,
      userAgent: navigator.userAgent.substring(0, 50) + '...',
      source: 'env',
    });
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

