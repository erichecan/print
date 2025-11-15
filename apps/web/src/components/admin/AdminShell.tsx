/**
 * Admin Shell Layout
 * [2025-11-12 01:10:00] Shared navigation and chrome for admin routes
 * [2025-11-12 02:25:00] 强化认证失败与权限不足的提示逻辑
 * [2025-11-15 12:35:00] 改为侧边栏布局，匹配原始 admin 设计
 */
'use client';

import { useEffect, useState, ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { authApi } from '@/lib/api';

interface AdminUser {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
}

type AuthState = 'loading' | 'authorized' | 'unauthenticated' | 'forbidden';

const NAV_LINKS = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/products', label: 'Products', icon: '🛍️' },
  { href: '/admin/categories', label: 'Categories', icon: '📁' },
  { href: '/admin/orders', label: 'Orders', icon: '📦' },
  { href: '/admin/users', label: 'Users', icon: '👥' },
  { href: '/admin/offline-orders', label: 'Offline Orders', icon: '🛠️' },
]; // [2025-11-11 06:13:03] 扩展后台导航链接

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authMessage, setAuthMessage] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
          error instanceof Error && error.message
            ? error.message
            : '请先登录后再访问后台。';
        setAuthMessage(message);
      });

    return () => {
      mounted = false;
    };
  }, [router]);

  const handleLogout = async () => {
    await authApi.logout();
    setUser(null);
    setAuthState('unauthenticated');
    setAuthMessage('会话已退出，请重新登录。');
    router.push('/login');
  };

  const isActive = (href: string, exact?: boolean) => {
    if (!pathname) {
      return false;
    }
    if (exact) {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  if (authState === 'loading') {
    return (
      <div className="admin-shell__container">
        <div className="admin-shell__loading">Loading admin workspace…</div>
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

  if (authState === 'unauthenticated') {
    return (
      <div className="admin-shell__container">
        <div className="admin-shell__guard">
          <h1>需要登录</h1>
          <p>{authMessage || '请先登录后再访问后台管理页面。'}</p>
          <div className="admin-shell__guard-actions">
            <button
              type="button"
              onClick={() => router.push('/login?redirect=/admin')}
              className="admin-shell__guard-button"
            >
              前往登录
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
            background: #ff1f3d;
            color: #fff;
            border: none;
            border-radius: 999px;
            font-weight: 600;
            cursor: pointer;
          }
          .admin-shell__guard-button:hover {
            background: #e3002b;
          }
        `}</style>
      </div>
    );
  }

  if (authState === 'forbidden' || !user) {
    return (
      <div className="admin-shell__container">
        <div className="admin-shell__guard">
          <h1>权限不足</h1>
          <p>{authMessage || '当前账号无管理员权限，请联系系统管理员。'}</p>
          <div className="admin-shell__guard-actions">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="admin-shell__guard-button admin-shell__guard-button--outline"
            >
              返回首页
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

  // [2025-11-15 12:35:00] 侧边栏布局，匹配原始 admin 设计
  return (
    <div className={`admin-grid ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className="admin-sidebar">
        <div className="admin-nav">
          <div className="admin-nav__header">
            <h3>suvernire plus</h3>
            <button
              type="button"
              className="admin-sidebar-toggle"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
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
                >
                  <span className="admin-nav-icon">{link.icon}</span>
                  {!sidebarCollapsed && <span>{link.label}</span>}
                </Link>
              </li>
            ))}
          </ul>
          {!sidebarCollapsed && (
            <div className="admin-nav__footer">
              <Link href="/" className="admin-nav__back-link">
                ← Back to Site
              </Link>
            </div>
          )}
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-header">
          <h1>
            {NAV_LINKS.find((link) => isActive(link.href, link.exact))?.label || 'Admin'}
          </h1>
          <div className="admin-user">
            <div className="admin-user-avatar"></div>
            <span className="admin-user-name">
              {user.firstName || user.email}
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="admin-logout-link"
            >
              Logout
            </button>
          </div>
        </header>
        <div className="admin-content">{children}</div>
      </main>

      <style jsx>{`
        .admin-grid {
          display: grid;
          grid-template-columns: 260px 1fr;
          min-height: 100vh;
          background: #f5f5f5;
        }
        .admin-grid.sidebar-collapsed {
          grid-template-columns: 72px 1fr;
        }
        .admin-sidebar {
          background: #fff;
          border-right: 1px solid #e5e5e5;
          padding: 24px 16px;
          position: sticky;
          top: 0;
          height: 100vh;
          overflow-y: auto;
        }
        .admin-nav__header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 24px;
        }
        .admin-nav__header h3 {
          font-size: 18px;
          font-weight: 700;
          margin: 0;
        }
        .admin-sidebar-toggle {
          border: 1px solid #e5e5e5;
          background: #fff;
          border-radius: 8px;
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .admin-sidebar-toggle:hover {
          background: #f5f5f5;
          border-color: #ff1f3d;
        }
        .admin-nav ul {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .admin-nav li {
          margin: 4px 0;
        }
        .admin-nav a {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 8px;
          color: #111827;
          text-decoration: none;
          font-weight: 500;
          transition: all 0.15s;
        }
        .admin-nav a:hover {
          background: #f5f5f5;
          color: #ff1f3d;
        }
        .admin-nav a.is-active {
          background: #ff1f3d;
          color: #fff;
        }
        .admin-nav-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 18px;
        }
        .admin-nav__footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e5e5;
        }
        .admin-nav__back-link {
          color: #6b7280;
          font-size: 14px;
          text-decoration: none;
        }
        .admin-nav__back-link:hover {
          color: #ff1f3d;
        }
        .admin-main {
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
        }
        .admin-header {
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          padding: 16px 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: sticky;
          top: 0;
          z-index: 100;
        }
        .admin-header h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }
        .admin-user {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .admin-user-avatar {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff1f3d, #e3002b);
        }
        .admin-user-name {
          font-weight: 600;
          font-size: 14px;
        }
        .admin-logout-link {
          background: none;
          border: none;
          color: #6b7280;
          text-decoration: none;
          font-size: 13px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s;
        }
        .admin-logout-link:hover {
          background: #f5f5f5;
          color: #ff1f3d;
        }
        .admin-content {
          flex: 1;
          padding: 24px;
        }
        @media (max-width: 768px) {
          .admin-grid {
            grid-template-columns: 1fr;
          }
          .admin-sidebar {
            display: none;
          }
        }
      `}</style>
    </div>
  );
}
