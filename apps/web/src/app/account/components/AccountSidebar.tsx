/**
 * Account Sidebar Navigation Component
 * [2025-01-27 14:40:00] 账户页面左侧导航栏组件
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ACCOUNT_ROUTES } from '@/lib/routes/account';

// [2025-12-18 22:40:00] 精简菜单：移除未实现的功能
const MENU = [
  { href: ACCOUNT_ROUTES.dashboard, label: '概览', icon: '🏠', exact: true },
  { href: ACCOUNT_ROUTES.orders, label: '订单', icon: '📋' },
  { href: ACCOUNT_ROUTES.addresses, label: '地址簿', icon: '📍' },
  { href: ACCOUNT_ROUTES.profile, label: '个人资料', icon: '👤' },
  { href: ACCOUNT_ROUTES.settings, label: '账户设置', icon: '⚙️' },
];

export function AccountSidebar() {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  return (
    <nav style={{ display: 'flex', flexDirection: 'column' }}>
      {MENU.map((item) => {
        const active = isActive(item.href, item.exact);
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px 24px',
              textDecoration: 'none',
              color: active ? '#2563eb' : '#1f2937',
              backgroundColor: active ? '#eff6ff' : 'transparent',
              borderLeft: active ? '3px solid #2563eb' : '3px solid transparent',
              fontWeight: active ? 600 : 400,
              fontSize: '15px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!active) {
                e.currentTarget.style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (!active) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
