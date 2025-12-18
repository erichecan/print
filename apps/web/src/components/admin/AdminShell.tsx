/**
 * Admin Shell Layout
 * [2025-11-12 01:10:00] Shared navigation and chrome for admin routes
 * [2025-11-12 02:25:00] 强化认证失败与权限不足的提示逻辑
 * [2025-11-15 12:35:00] 改为侧边栏布局，匹配原始 admin 设计
 */
'use client';

import { useCallback, useEffect, useMemo, useState, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/lib/api';
import { useAdminI18n } from '@/contexts/adminI18nContext';

interface AdminUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
}

type AuthState = 'loading' | 'authorized' | 'unauthenticated' | 'forbidden';

// [2025-11-16 14:05:30] 统一侧栏图标（SVG），避免 Emoji 在不同平台不一致
const ICONS: Record<string, JSX.Element> = {
  dashboard: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" />
    </svg>
  ),
  products: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M21 16V8l-9-5-9 5v8l9 5 9-5zM12 5.15L18.53 9 12 12.85 5.47 9 12 5.15zM5 10.73l6 3.47v5.65L5 16.38v-5.65zm8 9.12v-5.65l6-3.47v5.65L13 19.85z" />
    </svg>
  ),
  categories: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 3h8v8H3V3zm0 10h8v8H3v-8zm10 0h8v8h-8v-8zm0-10h8v8h-8V3z" />
    </svg>
  ),
  orders: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M7 4h10l1 2h3v2h-2l-2.6 9.59A2.003 2.003 0 0114.5 19h-5a2 2 0 01-1.92-1.46L5 8H3V6h3l1-2zm2.38 13h5.24l2.04-7H7.34l2.04 7zM7 22a1.5 1.5 0 110-3 1.5 1.5 0 010 3zm10 0a1.5 1.5 0 110-3 1.5 1.5 0 010 3z" />
    </svg>
  ),
  users: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 12a5 5 0 100-10 5 5 0 000 10zm-8 9a8 8 0 1116 0v1H4v-1z" />
    </svg>
  ),
  design: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41L18.37 3.3a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.84z" />
    </svg>
  ),
  production: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M22 13v7H2v-7h20zM4 6h4v5H4V6zm6 0h4v5h-4V6zm6 0h4v5h-4V6z" />
    </svg>
  ),
  costs: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M11 17h2v2h-2v-2zm0-12h2v10h-2V5zM12 1a11 11 0 100 22 11 11 0 000-22z" />
    </svg>
  ),
  coupons: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M21 5H3v4a2 2 0 110 4v4h18v-4a2 2 0 110-4V5zm-6 2h2v2h-2V7zM7 7h6v2H7V7zm0 4h10v2H7v-2z" />
    </svg>
  ),
  promotions: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 3h18v4H3V3zm0 6h18v12l-9-4-9 4V9z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M19.14 12.94a7.973 7.973 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.994 7.994 0 00-1.63-.95l-.36-2.54A.5.5 0 0012.9 1h-3.8a.5.5 0 00-.5.42l-.36 2.54c-.57.23-1.11.53-1.63.95l-2.39-.96a.5.5 0 00-.6.22L.8 7.03a.5.5 0 00.12.64l2.03 1.58c-.08.62-.08 1.26 0 1.88L.92 14.7a.5.5 0 00-.12.64l1.92 3.32c.14.25.44.35.7.24l2.39-.96c.5.42 1.06.75 1.63.98l.36 2.54c.05.26.26.44.5.44h3.8c.24 0 .45-.18.5-.44l.36-2.54c.57-.23 1.12-.56 1.63-.98l2.39.96c.26.11.56.01.7-.24l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.76zM11 8a4 4 0 110 8 4 4 0 010-8z" />
    </svg>
  ),
  artAssets: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
  ),
  suppliers: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
    </svg>
  ),
  fonts: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M9.93 13.5h4.14L12 7.98zM20 2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-4.05 16.5l-1.14-3H9.17l-1.12 3H5.96l5.11-13h1.86l5.11 13h-2.09z" />
    </svg>
  ),
  cms: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
    </svg>
  ),
  inventory: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M20 6h-2.18c.11-.31.18-.65.18-1a2.996 2.996 0 0 0-5.5-1.65l-.5.67-.5-.68C10.96 2.54 10 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"
      />
    </svg>
  ),
  analytics: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M3 3v18h18v-2H5V3H3zm16.59 1.41L18 6.83V13h-5.17l-2.58-2.59-4.24 4.24L3 10.83V8.41l5.66-5.66L11.83 5H19v5.17l2.59 2.58L24 10.83V5.83l-4.41-4.42z" />
    </svg>
  ),
  notifications: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
      <path fill="currentColor" d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path fill="currentColor" d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  ),
};

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard', exact: true, i18n: 'dashboard' },
  { href: '/admin/products', label: 'Products', icon: 'products', i18n: 'products' },
  { href: '/admin/categories', label: 'Categories', icon: 'categories', i18n: 'categories' },
  { href: '/admin/orders', label: 'Orders', icon: 'orders', i18n: 'orders' },
  { href: '/admin/notifications', label: 'Notifications', icon: 'notifications', i18n: 'notifications' }, // [2025-12-10 00:00:00] Guest messages notifications
  { href: '/admin/users', label: 'Users', icon: 'users', i18n: 'users' },
  { href: '/admin/designs', label: 'Design Review', icon: 'design', i18n: 'designReview' },
  { href: '/admin/offline-orders', label: 'Production', icon: 'production', i18n: 'production' }, // [2025-11-16 13:35:00] 生产管理
  { href: '/admin/inventory-alerts', label: 'Inventory Alerts', icon: 'inventory', i18n: 'inventoryAlerts' }, // [2025-12-06 16:00:00] 库存预警
  { href: '/admin/cost-management', label: 'Costs', icon: 'costs', i18n: 'costManagement' }, // [2025-01-28 08:50:00] 成本管理 - 使用 costManagement 翻译键
  { href: '/admin/coupons', label: 'Coupons', icon: 'coupons', i18n: 'coupons' },
  { href: '/admin/promotions', label: 'Promotions', icon: 'promotions', i18n: 'promotions' },
  { href: '/admin/analytics', label: 'Analytics', icon: 'analytics', i18n: 'analytics' }, // [2025-12-06 21:30:00] Analytics and Reports for Issue #160
  { href: '/admin/suppliers', label: 'Suppliers', icon: 'suppliers', i18n: 'suppliers' }, // [2025-12-06 17:10:00] Supplier management for Issue #89
  { href: '/admin/art-assets', label: 'Art Assets', icon: 'artAssets', i18n: 'artAssets' }, // [2025-01-28 01:10:00] Design Lab art assets CMS
  { href: '/admin/fonts', label: 'Fonts', icon: 'fonts', i18n: 'fonts' }, // [2025-01-30 19:00:00] Font management
  { href: '/admin/content-manager', label: 'CMS', icon: 'cms', i18n: 'cms' }, // [2025-01-28 08:00:00] Content Management System
  { href: '/admin/settings', label: 'Settings', icon: 'settings', i18n: 'settings' },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authMessage, setAuthMessage] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { locale, setLocale, t } = useAdminI18n();

  useEffect(() => {
    let mounted = true;
    authApi
      .me()
      .then((data: any) => {
        if (!mounted) {
          return;
        }
        // [2025-01-28 07:30:00] 检查用户角色，必须是 ADMIN（支持大小写）
        if (data.role !== 'ADMIN' && data.role !== 'admin') {
          setAuthState('forbidden');
          setAuthMessage('Access denied. Admin privileges required. Please use customer login at /login for account access.');
          return;
        }
        setUser(data);
        setAuthState('authorized');
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        
        // [2025-01-27 16:10:00] 区分网络错误和认证错误
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isNetworkError = errorMessage.includes('Network error') || 
                              errorMessage.includes('connect to server') ||
                              errorMessage.includes('Empty response');
        
        if (isNetworkError) {
          // 网络错误：可能是后端服务器崩溃或重启，不要立即跳转，给用户提示
          console.error('[AdminShell] Network error checking auth:', errorMessage);
          setAuthMessage('无法连接到服务器，请稍后重试。如果问题持续，请检查后端服务是否正常运行。');
          // 延迟重试而不是立即跳转
          setTimeout(() => {
            if (mounted) {
              setAuthState('unauthenticated');
            }
          }, 3000);
          return;
        }
        
        // 认证错误：用户未登录或token无效，立即跳转
        setAuthState('unauthenticated');
        const message =
          error instanceof Error && error.message ? error.message : t('loginRedirectMessage');
        setAuthMessage(message);
      });

    return () => {
      mounted = false;
    };
  }, [router, pathname, t]);

  // [2025-01-28 07:30:00] 未登录时直接跳转到管理员专用登录页
  // [2025-11-28 10:35:00] 如果当前路径是登录页面，则不执行重定向，避免循环
  useEffect(() => {
    if (authState !== 'unauthenticated') {
      return;
    }
    // [2025-11-28 10:35:00] 如果已经在登录页面，不执行重定向
    if (pathname === '/admin/login' || pathname?.startsWith('/admin/login?')) {
      return;
    }
    const redirectTarget = pathname && pathname.startsWith('/admin') ? pathname : '/admin';
    router.replace(`/admin/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [authState, pathname, router]);

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    setAuthState('unauthenticated');
    // [2025-11-16 14:30:00] 使用 i18n 消息提示退出状态
    setAuthMessage(t('logoutMessage'));
    // [2025-01-28 07:30:00] 退出后跳转到管理员登录页面
    router.push('/admin/login');
  };

  const isActive = useCallback(
    (href: string, exact?: boolean) => {
      if (!pathname) {
        return false;
      }
      if (exact) {
        return pathname === href;
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    },
    [pathname],
  ); // [2025-11-16 12:55:00] useCallback 保持导航判定引用稳定

  const currentNav = useMemo(() => {
    return NAV_LINKS.find((link) => isActive(link.href, link.exact));
  }, [isActive]);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []); // [2025-11-16 13:35:00] useCallback 防止事件绑定抖动

  const toggleSidebarMobile = () => {
    setSidebarOpen((prev) => !prev);
  };

  // [2025-11-16 14:29:00] 语言切换按钮，写入本地偏好
  const handleLocaleChange = (nextLocale: 'en' | 'zh') => {
    if (nextLocale === locale) {
      return;
    }
    setLocale(nextLocale);
  };

  if (authState === 'loading') {
    return (
      <div className="admin-shell__container">
        <div className="admin-shell__loading">{t('loadingAdmin')}</div>
        <style jsx>{`
          .admin-shell__container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
            color: #666;
            font-size: 16px;
          }
        `}</style>
      </div>
    );
  }

  // [2025-11-16 14:05:00] 保留占位提示，但展示为自动跳转状态
  if (authState === 'unauthenticated') {
    return (
      <div className="admin-shell__container">
        <div className="admin-shell__guard">
          <h1>{t('loginRedirectTitle')}</h1>
          <p>{authMessage || t('loginRedirectMessage')}</p>
        </div>
        <style jsx>{`
          .admin-shell__container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
          }
          .admin-shell__guard {
            display: grid;
            gap: 16px;
            padding: 40px;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
            text-align: center;
          }
        `}</style>
      </div>
    );
  }

  if (authState === 'forbidden' || !user) {
    return (
      <div className="admin-shell__container">
        <div className="admin-shell__guard">
          <h1>{t('forbiddenTitle')}</h1>
          <p>{authMessage || t('forbiddenMessage')}</p>
          <div className="admin-shell__guard-actions">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="admin-shell__guard-button admin-shell__guard-button--outline"
            >
              {t('backToSite')}
            </button>
          </div>
        </div>
        <style jsx>{`
          .admin-shell__container {
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f5f5f5;
          }
          .admin-shell__guard {
            display: grid;
            gap: 16px;
            padding: 40px;
            border-radius: 16px;
            background: #ffffff;
            box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
            text-align: center;
          }
          .admin-shell__guard-actions {
            display: flex;
            justify-content: center;
          }
          .admin-shell__guard-button {
            padding: 12px 24px;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
            border: none;
            background: #ff1f3d;
            color: #fff;
          }
          .admin-shell__guard-button--outline {
            background: transparent;
            color: #ff1f3d;
            border: 1px solid rgba(255, 31, 61, 0.4);
          }
          .admin-shell__guard-button:hover {
            background: #e3002b;
            color: #fff;
          }
          .admin-shell__guard-button--outline:hover {
            background: rgba(255, 31, 61, 0.1);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`admin-grid ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-nav">
          <div className="admin-nav__header">
            <h3>suvernire plus</h3>
            <button
              type="button"
              className="admin-sidebar-toggle"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
          </div>
          <ul>
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={isActive(link.href, link.exact) ? 'is-active' : ''}
                  data-i18n={link.i18n}
                  onClick={() => setSidebarOpen(false)}
                >
                  <span className="admin-nav-icon" aria-hidden="true">{ICONS[link.icon]}</span>
                  {!sidebarCollapsed && <span>{t(link.i18n)}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {!sidebarCollapsed && (
            <div className="admin-nav__footer">
              <Link href="/" className="admin-nav__back-link" data-i18n="backToSite">
                {t('backToSite')}
              </Link>
            </div>
          )}
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <div className="admin-header-left">
            <button
              type="button"
              className="admin-sidebar-toggle admin-sidebar-toggle--mobile"
              onClick={toggleSidebarMobile}
              aria-label="Open sidebar"
            >
              ☰
            </button>
            <h1 data-i18n={currentNav?.i18n || 'dashboard'}>
              {t(currentNav?.i18n || 'dashboard')}
            </h1>
          </div>
          <div className="admin-user">
            <div className="admin-user-avatar" aria-hidden="true"></div>
            <span className="admin-user-name">{user.firstName || user.email}</span>
            <button type="button" onClick={handleLogout} className="admin-logout-link" data-i18n="logout">
              {t('logout')}
            </button>
            <div className="admin-lang-toggle" role="group" aria-label={t('languageLabel')}>
              <button
                type="button"
                className={locale === 'en' ? 'is-active' : ''}
                onClick={() => handleLocaleChange('en')}
              >
                {t('languageEnglish')}
              </button>
              <button
                type="button"
                className={locale === 'zh' ? 'is-active' : ''}
                onClick={() => handleLocaleChange('zh')}
              >
                {t('languageChinese')}
              </button>
            </div>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
