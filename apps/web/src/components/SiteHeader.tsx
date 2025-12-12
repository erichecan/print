/**
 * Site Header component
 * [2025-11-11 23:56:10] Migrated marketing header layout from prototype into Next.js
 * [2025-01-28 06:25:00] Updated to read navigation and static texts from CMS
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation'; // [2025-01-28 18:15:00] 添加 usePathname 用于路由监听
import { FormEvent, useState, useEffect } from 'react';
import useSWR from 'swr';
import { contentApi, NavigationMenuItem } from '@/lib/api';
import { CartIcon } from '@/components/CartIcon';
import { useAuth } from '@/contexts/AuthContext'; // [2025-01-28 07:30:00] 使用认证状态
import { ACCOUNT_ROUTES } from '@/lib/routes/account'; // [2025-01-27 15:50:00] 使用路由映射

export function SiteHeader() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // [2025-01-28 07:30:00] 获取用户认证状态
  // [2025-01-28 15:00:00] 移动端菜单状态管理
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // [2025-01-28 06:25:00] 从 CMS 获取内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const navigation = contentData?.data?.navigation || [];
  const topMessageBar = contentData?.data?.staticTexts?.topMessageBar || 'Custom T-shirts & Promotional Products • Fast & Free Shipping • All-inclusive Pricing';
  
  const pathname = usePathname(); // [2025-01-28 18:15:00] 获取当前路径
  
  // [2025-01-28 15:00:00] 关闭移动端菜单当路由改变时（通过监听路径变化）
  useEffect(() => {
    setIsMobileMenuOpen(false); // [2025-01-28 18:15:00] 当 pathname 变化时关闭菜单
  }, [pathname]); // 使用 pathname 而不是 router 对象
  
  // [2025-01-28 15:00:00] 防止滚动当移动端菜单打开时
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

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
  // [2025-01-28 12:00:00] 修改：隐藏下拉菜单，只保留一级导航
  const renderNavigationItem = (item: NavigationMenuItem) => {
    // 所有类型的菜单项都只渲染为简单链接，不显示下拉面板
    return (
      <li key={item.id} className="mega__item">
        <Link href={item.href} className="mega__trigger">
          {item.label}
        </Link>
      </li>
    );
  };

  // [2025-01-28 15:00:00] 渲染移动端导航菜单项（简化版，无mega menu）
  const renderMobileNavigationItem = (item: NavigationMenuItem) => {
    if (item.type === 'link') {
      return (
        <li key={item.id}>
          <Link 
            href={item.href} 
            className="mobile-nav__link"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {item.label}
          </Link>
        </li>
      );
    }
    
    // 对于 mega 和 simple 类型的菜单，移动端只显示主链接
    return (
      <li key={item.id}>
        <Link 
          href={item.href} 
          className="mobile-nav__link"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          {item.label}
        </Link>
      </li>
    );
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
          {/* [2025-01-28 15:00:00] 移动端汉堡菜单按钮 */}
          <button
            type="button"
            className="mobile-menu-toggle"
            aria-label="Toggle navigation menu"
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className="mobile-menu-toggle__icon">
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
              <span className="hamburger-line"></span>
            </span>
          </button>
          
          <div className="site-header__brand">
            <Link href="/" aria-label="Suvernire Plus home">
              {/* [2025-01-29 03:00:00] 使用 Souvenir Plus Inc 官方 logo */}
              <Image src="/logo.png" alt="Souvenir Plus Inc" width={200} height={34} priority />
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
          {/* [2025-01-28 15:00:00] 移动端操作按钮（账户、购物车） */}
          <div className="site-header__mobile-actions">
            {authLoading ? (
              <span style={{ opacity: 0.6 }}>Loading...</span>
            ) : user ? (
              <Link href={ACCOUNT_ROUTES.dashboard} className="mobile-account-link" aria-label="My Account">
                <Image src="/assets/icon-person.svg" alt="" width={20} height={20} aria-hidden="true" />
              </Link>
            ) : (
              <Link href="/login" aria-label="Sign in">
                <Image src="/assets/icon-person.svg" alt="" width={20} height={20} aria-hidden="true" />
              </Link>
            )}
            <CartIcon />
          </div>
        </div>
        {/* [2025-01-28 15:00:00] 桌面端导航 */}
        <nav className="primary-nav primary-nav--desktop" aria-label="Primary">
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
                    <Link href="/promotional-products" className="mega__trigger">Promotional Products</Link>
                  </li>
                  <li className="mega__item">
                    <Link href="/design-lab" className="mega__trigger">Design Lab</Link>
                  </li>
                  <li className="mega__item">
                    <Link href="/group-orders" className="mega__trigger">Groups & Events</Link>
                  </li>
                </>
              )}
            </ul>
            <div className="primary-nav__actions">
              {/* [2025-01-28 07:30:00] 根据登录状态显示不同内容 */}
              {authLoading ? (
                <span style={{ opacity: 0.6 }}>Loading...</span>
              ) : user ? (
                <Link href={ACCOUNT_ROUTES.dashboard} className="primary-nav__account">
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
      
      {/* [2025-01-28 15:00:00] 移动端侧边抽屉菜单 */}
      <div 
        className={`mobile-menu-overlay ${isMobileMenuOpen ? 'mobile-menu-overlay--open' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
        aria-hidden={!isMobileMenuOpen}
      ></div>
      <nav 
        className={`mobile-nav ${isMobileMenuOpen ? 'mobile-nav--open' : ''}`}
        aria-label="Mobile navigation"
        aria-hidden={!isMobileMenuOpen}
      >
        <div className="mobile-nav__header">
          <Link 
            href="/" 
            className="mobile-nav__logo"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            {/* [2025-01-29 03:00:00] 使用 Souvenir Plus Inc 官方 logo */}
            <Image src="/logo.png" alt="Souvenir Plus Inc" width={200} height={34} />
          </Link>
          <button
            type="button"
            className="mobile-nav__close"
            aria-label="Close navigation menu"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <span>×</span>
          </button>
        </div>
        <ul className="mobile-nav__list">
          {/* [2025-01-28 15:00:00] 从 CMS 渲染移动端导航菜单 */}
          {navigation.length > 0 ? (
            navigation
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((item) => renderMobileNavigationItem(item))
          ) : (
            // [2025-01-28 15:00:00] 默认导航（向后兼容）
            <>
              <li>
                <Link href="/products" className="mobile-nav__link" onClick={() => setIsMobileMenuOpen(false)}>
                  Custom T-shirts
                </Link>
              </li>
              <li>
                <Link href="/collections/apparel" className="mobile-nav__link" onClick={() => setIsMobileMenuOpen(false)}>
                  Custom Apparel
                </Link>
              </li>
              <li>
                <Link href="/promotional-products" className="mobile-nav__link" onClick={() => setIsMobileMenuOpen(false)}>
                  Promotional Products
                </Link>
              </li>
              <li>
                <Link href="/design-lab" className="mobile-nav__link" onClick={() => setIsMobileMenuOpen(false)}>
                  Design Lab
                </Link>
              </li>
              <li>
                <Link href="/group-orders" className="mobile-nav__link" onClick={() => setIsMobileMenuOpen(false)}>
                  Groups & Events
                </Link>
              </li>
            </>
          )}
        </ul>
        <div className="mobile-nav__footer">
          {authLoading ? (
            <span style={{ opacity: 0.6 }}>Loading...</span>
          ) : user ? (
            <Link 
              href={ACCOUNT_ROUTES.dashboard} 
              className="mobile-nav__account-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/assets/icon-person.svg" alt="" width={20} height={20} aria-hidden="true" />
              <span>My Account</span>
            </Link>
          ) : (
            <Link 
              href="/login" 
              className="mobile-nav__login-link"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Image src="/assets/icon-person.svg" alt="" width={20} height={20} aria-hidden="true" />
              <span>Sign in</span>
            </Link>
          )}
        </div>
      </nav>
    </>
  );
}

