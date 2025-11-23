/**
 * Account Layout
 * [2025-01-27] 账户页面布局，包含左侧导航栏
 */
'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

interface AccountLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/account', label: 'Overview', icon: '🏠', exact: true },
  { href: '/account/designs', label: 'My Designs', icon: '📁' },
  { href: '/account/uploads', label: 'My Uploads', icon: '☁️' },
  { href: '/account/orders', label: 'Order History', icon: '📋' },
  { href: '/account/group-orders', label: 'Group Orders', icon: '👥' },
  { href: '/account/fundraising', label: 'Fundraising', icon: '❤️' },
  { href: '/account/stores', label: 'Online Stores', icon: '🏪' },
  { href: '/account/settings', label: 'Account Settings', icon: '⚙️' },
];

export default function AccountLayout({ children }: AccountLayoutProps) {
  const pathname = usePathname();

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

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
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {navItems.map((item) => {
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
      </aside>

      {/* 主内容区域 */}
      <main style={{
        flex: 1,
        padding: '0 48px',
        maxWidth: '1200px',
        width: '100%',
      }}>
        {children}
      </main>
    </div>
  );
}

