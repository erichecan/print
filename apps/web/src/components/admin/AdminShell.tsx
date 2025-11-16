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

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true, i18n: 'dashboard' },
  { href: '/admin/products', label: 'Products', icon: '🛍️', i18n: 'products' },
  { href: '/admin/categories', label: 'Categories', icon: '📁', i18n: 'categories' },
  { href: '/admin/orders', label: 'Orders', icon: '📦', i18n: 'orders' },
  { href: '/admin/users', label: 'Users', icon: '👥', i18n: 'users' },
  { href: '/admin/designs', label: 'Design Review', icon: '🎨', i18n: 'designReview' },
  { href: '/admin/offline-orders', label: 'Production', icon: '🧵', i18n: 'production' }, // [2025-11-16 13:35:00] 生产管理
  { href: '/admin/cost-management', label: 'Costs', icon: '💰', i18n: 'costs' }, // [2025-11-16 13:35:00] 成本管理
  { href: '/admin/coupons', label: 'Coupons', icon: '🎫', i18n: 'coupons' },
  { href: '/admin/promotions', label: 'Promotions', icon: '🎉', i18n: 'promotions' },
  { href: '/admin/settings', label: 'Settings', icon: '⚙️', i18n: 'settings' },
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
        if (data.role !== 'ADMIN') {
          setAuthState('forbidden');
          setAuthMessage('当前账号无管理员权限，无法访问后台。');
          return;
        }
        setUser(data);
        setAuthState('authorized');
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        setAuthState('unauthenticated');
        const message =
          error instanceof Error && error.message ? error.message : t('loginRedirectMessage');
        setAuthMessage(message);
      });

    return () => {
      mounted = false;
    };
  }, [router, pathname, t]);

  // [2025-11-16 14:05:00] 未登录时直接跳转到登录页，避免出现中间提示页
  useEffect(() => {
    if (authState !== 'unauthenticated') {
      return;
    }
    const redirectTarget = pathname && pathname.startsWith('/admin') ? pathname : '/admin';
    router.replace(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
  }, [authState, pathname, router]);

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    setAuthState('unauthenticated');
    // [2025-11-16 14:30:00] 使用 i18n 消息提示退出状态
    setAuthMessage(t('logoutMessage'));
    router.push('/login');
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
                  <span className="admin-nav-icon">{link.icon}</span>
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
          <div className="admin-user">
            <div className="admin-user-avatar" aria-hidden="true"></div>
            <span className="admin-user-name">{user.firstName || user.email}</span>
            <button type="button" onClick={handleLogout} className="admin-logout-link" data-i18n="logout">
              {t('logout')}
            </button>
          </div>
        </header>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  );
}
