/**
 * Site Header component
 * [2025-11-11 23:56:10] Migrated marketing header layout from prototype into Next.js
 * [2025-01-28 06:25:00] Updated to read navigation and static texts from CMS
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent } from 'react';
import useSWR from 'swr';
import { contentApi, NavigationMenuItem } from '@/lib/api';
import { CartIcon } from '@/components/CartIcon';
import { useAuth } from '@/contexts/AuthContext'; // [2025-01-28 07:30:00] 使用认证状态

export function SiteHeader() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // [2025-01-28 07:30:00] 获取用户认证状态
  // [2025-01-28 06:25:00] 从 CMS 获取内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const navigation = contentData?.data?.navigation || [];
  const topMessageBar = contentData?.data?.staticTexts?.topMessageBar || 'Custom T-shirts & Promotional Products • Fast & Free Shipping • All-inclusive Pricing';

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const query = (formData.get('q') as string)?.trim();
    if (!query) {
      router.push('/products');
      return;
    }
    router.push(`/products?search=${encodeURIComponent(query)}`);
  };

  // [2025-01-28 06:25:00] 渲染导航菜单项
  const renderNavigationItem = (item: NavigationMenuItem) => {
    if (item.type === 'link') {
      return (
        <li key={item.id} className="mega__item">
          <Link href={item.href} className="mega__trigger">
            {item.label}
          </Link>
        </li>
      );
    }

    if (item.type === 'mega' && item.megaPanel) {
      return (
        <li key={item.id} className="mega__item">
          <Link href={item.href} className="mega__trigger">
            {item.label}
          </Link>
          <div className="mega__panel" role="region" aria-label={item.label}>
            <div className="mega__cols">
              {item.megaPanel.columns.map((col) => (
                <div key={col.id} className="mega__col">
                  {col.links.map((link) => (
                    <Link key={link.id} href={link.href}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </li>
      );
    }

    if (item.type === 'simple' && item.simplePanel) {
      return (
        <li key={item.id} className="mega__item">
          <Link href={item.href} className="mega__trigger">
            {item.label}
          </Link>
          <div className="mega__panel mega__panel--simple">
            <div className="mega__cta">
              <h3>{item.simplePanel.title}</h3>
              <p>{item.simplePanel.description}</p>
              <div className="mega__cta-actions">
                {item.simplePanel.actions.map((action, index) => (
                  <Link
                    key={index}
                    className={`btn${action.variant === 'outline' ? ' btn--outline' : ' btn--primary'}`}
                    href={action.href}
                  >
                    {action.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </li>
      );
    }

    return null;
  };

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="top-message-bar" role="region" aria-label="Promotional message">
        {topMessageBar}
      </div>
      <header className="site-header" role="banner">
        <div className="container site-header__row">
          <div className="site-header__brand">
            <Link href="/" aria-label="Suvernire Plus home">
              <Image src="/assets/logo.svg" alt="Suvernire Plus" width={160} height={44} priority />
            </Link>
          </div>
          <div className="site-header__search" role="search">
            <form onSubmit={handleSearch} aria-label="Site search form">
              <button type="submit" aria-label="Search products">
                🔍
              </button>
              <input
                type="search"
                name="q"
                placeholder="Search for t-shirts, hoodies, drinkware, and more"
                aria-label="Search query"
              />
            </form>
          </div>
          <div className="site-header__contact" aria-label="Contact options">
            <div className="contact-card">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M6.62 10.79a15.05 15.05 0 006.59 6.59l2.2-2.2a1 1 0 011.01-.24 11.36 11.36 0 003.56.57 1 1 0 011 1v3.6a1 1 0 01-.91 1 19 19 0 01-8.29-2.77 18.83 18.83 0 01-5.78-5.78A19 19 0 012.9 4.93a1 1 0 011-.91H7.5a1 1 0 011 1 11.36 11.36 0 00.57 3.56 1 1 0 01-.24 1.01l-2.21 2.2z"
                />
              </svg>
              <div>
                <span className="label">Talk to a Real Person</span>
                <a className="value" href="tel:8552712660">
                  855-271-2660
                </a>
              </div>
            </div>
            <div className="contact-card">
              <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path
                  fill="currentColor"
                  d="M20 2H4a2 2 0 00-2 2v16l4-4h14a2 2 0 002-2V4a2 2 0 00-2-2z"
                />
              </svg>
              <div>
                <span className="label">Chat with a Real Person</span>
                <Link className="value" href="/help">
                  Chat now
                </Link>
              </div>
            </div>
          </div>
        </div>
        <nav className="primary-nav" aria-label="Primary">
          <div className="container primary-nav__inner">
            <ul className="mega">
              {/* [2025-01-28 06:25:00] 从 CMS 渲染导航菜单 */}
              {navigation.length > 0 ? (
                navigation
                  .sort((a, b) => (a.order || 0) - (b.order || 0))
                  .map((item) => renderNavigationItem(item))
              ) : (
                // [2025-01-28 06:25:00] 如果 CMS 数据为空，显示默认导航（向后兼容）
                <>
                  <li className="mega__item">
                    <Link href="/products" className="mega__trigger">Custom T-shirts</Link>
                  </li>
                  <li className="mega__item">
                    <Link href="/collections/apparel" className="mega__trigger">Custom Apparel</Link>
                  </li>
                  <li className="mega__item">
                    <Link href="/collections/promotional-products" className="mega__trigger">Promotional Products</Link>
                  </li>
                  <li className="mega__item">
                    <Link href="/design-lab" className="mega__trigger">Design Lab</Link>
                  </li>
                  <li className="mega__item">
                    <Link href="/help" className="mega__trigger">Groups & Events</Link>
                  </li>
                </>
              )}
            </ul>
            <div className="primary-nav__actions">
              {/* [2025-01-28 07:30:00] 根据登录状态显示不同内容 */}
              {authLoading ? (
                <span style={{ opacity: 0.6 }}>Loading...</span>
              ) : user ? (
                <Link href="/account" className="primary-nav__account">
                  <Image src="/assets/icon-person.svg" alt="" width={20} height={20} aria-hidden="true" />
                  <span>My Account</span>
                </Link>
              ) : (
                <Link href="/login">
                  <Image src="/assets/icon-person.svg" alt="" width={20} height={20} aria-hidden="true" />
                  <span>Sign in</span>
                </Link>
              )}
              <CartIcon />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

