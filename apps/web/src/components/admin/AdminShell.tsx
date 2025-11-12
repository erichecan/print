/**
 * Admin Shell Layout
 * [2025-11-12 01:10:00] Shared navigation and chrome for admin routes
 * [2025-11-12 02:25:00] 强化认证失败与权限不足的提示逻辑
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
  { href: '/admin', label: 'Dashboard', exact: true },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/offline-orders', label: 'Offline Orders' },
]; // [2025-11-11 06:13:03] 扩展后台导航链接

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authState, setAuthState] = useState<AuthState>('loading');
  const [authMessage, setAuthMessage] = useState('');

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
    <div className="admin-shell">
      <header className="admin-shell__header" role="banner">
        <div>
          <h1>Admin</h1>
          <p className="admin-shell__subtitle">
            Welcome back, {user.firstName || user.email}
          </p>
        </div>
        <nav aria-label="Admin navigation" className="admin-shell__nav">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`admin-shell__nav-link ${isActive(link.href, link.exact) ? 'is-active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
          <button type="button" className="admin-shell__logout" onClick={handleLogout}>
            Logout
          </button>
        </nav>
      </header>
      <main className="admin-shell__main">{children}</main>
      <style jsx>{`
        .admin-shell {
          min-height: 100vh;
          background: #f5f5f5;
          display: flex;
          flex-direction: column;
        }
        .admin-shell__header {
          background: #fff;
          border-bottom: 1px solid #e5e5e5;
          padding: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }
        .admin-shell__header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
        }
        .admin-shell__subtitle {
          margin: 4px 0 0;
          color: #666;
          font-size: 14px;
        }
        .admin-shell__nav {
          display: flex;
          gap: 16px;
          align-items: center;
          flex-wrap: wrap;
        }
        .admin-shell__nav-link {
          color: #666;
          text-decoration: none;
          font-size: 14px;
          padding: 8px 12px;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .admin-shell__nav-link:hover {
          background: #f5f5f5;
        }
        .admin-shell__nav-link.is-active {
          color: #ff1f3d;
          background: rgba(255, 31, 61, 0.1);
          font-weight: 600;
        }
        .admin-shell__logout {
          padding: 8px 16px;
          background: #ff1f3d;
          color: white;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .admin-shell__logout:hover {
          background: #e3002b;
        }
        .admin-shell__main {
          flex: 1;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding: 32px 24px 48px;
        }

        @media (max-width: 768px) {
          .admin-shell__header {
            align-items: flex-start;
          }
          .admin-shell__nav {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

