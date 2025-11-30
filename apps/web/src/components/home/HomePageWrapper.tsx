/**
 * Home Page Wrapper
 * [2025-01-29 04:05:00] 根据设备类型显示桌面端或移动端首页
 */
'use client';

import { useIsMobile } from '@/hooks/useIsMobile';
import { HomeClient } from './HomeClient';
import { HomeMobileClient } from './HomeMobileClient';

export function HomePageWrapper() {
  const isMobile = useIsMobile();

  // [2025-01-29 04:05:00] 根据设备类型显示不同的首页组件
  if (isMobile) {
    return <HomeMobileClient />;
  }

  return <HomeClient />;
}

