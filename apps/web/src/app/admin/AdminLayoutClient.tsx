/**
 * Admin Layout Client Component
 * [2025-11-28 10:30:00] 客户端包装器，检查路径并排除登录页面使用 AdminShell
 * 修复登录页面重定向循环问题
 */
'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';

export default function AdminLayoutClient({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  
  // [2025-11-28 10:30:00] 登录页面不使用 AdminShell，避免重定向循环
  const isLoginPage = pathname === '/admin/login' || pathname?.startsWith('/admin/login?');
  // [2025-12-07 05:20:00] 配置页面不使用 AdminShell，使用自己的布局
  const isConfigPage = pathname === '/admin/offline-orders/config';
  
  if (isLoginPage || isConfigPage) {
    // 登录页面和配置页面直接渲染，不使用 AdminShell
    return <>{children}</>;
  }
  
  // 其他 admin 页面使用 AdminShell
  return (
    <div className="admin-body">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}

