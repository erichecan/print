/**
 * Mobile Account Navigation Component
 * 移动端账户页面导航组件
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ACCOUNT_ROUTES } from '@/lib/routes/account';

interface MenuItem {
    href: string;
    label: string;
    icon: string;
}

const MENU: MenuItem[] = [
    { href: ACCOUNT_ROUTES.orders, label: 'Orders', icon: '📋' },
    { href: ACCOUNT_ROUTES.designs, label: 'Designs', icon: '🎨' },
    { href: ACCOUNT_ROUTES.addresses, label: 'Addresses', icon: '📍' },
    { href: ACCOUNT_ROUTES.profile, label: 'Profile', icon: '👤' },
    { href: ACCOUNT_ROUTES.settings, label: 'Settings', icon: '⚙️' },
];

export function AccountMobileNavbar() {
    const pathname = usePathname();

    const isActive = (href: string) => {
        return pathname === href || pathname?.startsWith(`${href}/`);
    };

    return (
        <nav className="mobile-account-nav">
            <div className="mobile-account-nav__scroll">
                {MENU.map((item) => {
                    const active = isActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`mobile-account-nav__item ${active ? 'mobile-account-nav__item--active' : ''}`}
                        >
                            <span className="mobile-account-nav__icon">{item.icon}</span>
                            <span className="mobile-account-nav__label">{item.label}</span>
                        </Link>
                    );
                })}
            </div>

            <style jsx>{`
        .mobile-account-nav {
          background: #ffffff;
          border-bottom: 1px solid #e5e7eb;
          position: sticky;
          top: 0;
          z-index: 10;
          width: 100%;
          overflow: hidden;
        }
        .mobile-account-nav__scroll {
          display: flex;
          overflow-x: auto;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          padding: 8px 16px;
          gap: 16px;
        }
        .mobile-account-nav__scroll::-webkit-scrollbar {
          display: none;
        }
        .mobile-account-nav__item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-decoration: none;
          color: #6b7280;
          min-width: 64px;
          padding: 8px 4px;
          border-radius: 0;
          transition: all 0.2s;
        }
        .mobile-account-nav__item--active {
          color: #000;
          background-color: #eff6ff;
        }
        .mobile-account-nav__icon {
          font-size: 20px;
        }
        .mobile-account-nav__label {
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }
      `}</style>
        </nav>
    );
}
