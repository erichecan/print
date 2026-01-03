/**
 * Account Sidebar Navigation Component
* 账户页面左侧导航栏组件
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ACCOUNT_ROUTES } from '@/lib/routes/account';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

interface MenuItem {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const MENU: MenuItem[] = [
  // Overview removed as per request
  // { href: ACCOUNT_ROUTES.dashboard, label: 'Overview', icon: '🏠', exact: true },
  { href: ACCOUNT_ROUTES.orders, label: 'Orders', icon: '📋' },
  { href: ACCOUNT_ROUTES.designs, label: 'My Designs', icon: '🎨' },
  { href: ACCOUNT_ROUTES.addresses, label: 'Address Book', icon: '📍' },
  { href: ACCOUNT_ROUTES.profile, label: 'Profile', icon: '👤' },
  { href: ACCOUNT_ROUTES.settings, label: 'Account Settings', icon: '⚙️' },
];

export function AccountSidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname?.startsWith(`${href}/`);
  };

  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isLoggingOut) return;

    try {
      setIsLoggingOut(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
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

      <div style={{ margin: '12px 0', borderTop: '1px solid #e5e7eb' }} />

      <button
        onClick={handleLogout}
        disabled={isLoggingOut}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 24px',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: isLoggingOut ? 'not-allowed' : 'pointer',
          color: '#ef4444',
          fontSize: '15px',
          textAlign: 'left',
          transition: 'all 0.2s',
          borderLeft: '3px solid transparent',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#fef2f2';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
        }}
      >
        <span style={{ fontSize: '20px', width: '24px', textAlign: 'center' }}>🚪</span>
        <span>{isLoggingOut ? 'Logging out...' : 'Log Out'}</span>
      </button>
    </nav>
  );
}
