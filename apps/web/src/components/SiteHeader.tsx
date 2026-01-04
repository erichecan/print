/**
 * Site Header component
* Migrated marketing header layout from prototype into Next.js
* Updated to read navigation and static texts from CMS
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, usePathname } from 'next/navigation'; // 添加 usePathname 用于路由监听
import { FormEvent, useState, useEffect } from 'react';
import useSWR from 'swr';
import { contentApi, NavigationMenuItem } from '@/lib/api';
import { CartIcon } from '@/components/CartIcon';
import { useAuth } from '@/contexts/AuthContext'; // 使用认证状态
import { ACCOUNT_ROUTES } from '@/lib/routes/account'; // 使用路由映射

export function SiteHeader() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth(); // 获取用户认证状态
  // 移动端菜单状态管理
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // 从 CMS 获取内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const navigation = contentData?.data?.navigation || [];
  const topMessageBar = contentData?.data?.staticTexts?.topMessageBar || 'Custom T-shirts & Promotional Products • Fast & Free Shipping • All-inclusive Pricing';

  const pathname = usePathname(); // 获取当前路径

  // 关闭移动端菜单当路由改变时（通过监听路径变化）
  useEffect(() => {
    setIsMobileMenuOpen(false); // 当 pathname 变化时关闭菜单
  }, [pathname]); // 使用 pathname 而不是 router 对象

  // 防止滚动当移动端菜单打开时
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

  // 渲染导航菜单项
  // 修改：隐藏下拉菜单，只保留一级导航
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

  // 渲染移动端导航菜单项（简化版，无mega menu）
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

      {/* 移动端顶部工具栏 - 参考截图 */}
      <div className="md:hidden bg-[#f9fafb] border-b border-gray-200 py-2 px-4 flex justify-between items-center text-[13px] text-gray-600">
        <div className="font-medium">Design Custom T-shirts & More</div>
        <Link href="/help" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
          </svg>
          Help
        </Link>
      </div>

      <div className="top-message-bar hidden md:block" role="region" aria-label="Promotional message">
        {topMessageBar}
      </div>

      <header className="site-header border-b border-gray-100" role="banner">
        {/* 移动端主导航行 - 匹配截图 */}
        <div className="!flex md:!hidden items-center justify-between px-4 py-3 bg-white">
          <button
            type="button"
            className="p-1 -ml-1 text-gray-800"
            aria-label="Toggle navigation menu"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="flex-1 flex justify-center px-4">
            <Link href="/" aria-label="Suvernire Plus home">
              <Image src="/logo.png" alt="Souvenir Plus Inc" width={140} height={24} priority className="h-6 w-auto object-contain" />
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {authLoading ? (
              <div className="w-6 h-6 rounded-full bg-gray-100 animate-pulse" />
            ) : user ? (
              <Link href={ACCOUNT_ROUTES.dashboard} className="flex flex-col items-center gap-0.5" aria-label="My Account">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] text-gray-500 font-medium">My Account</span>
              </Link>
            ) : (
              <Link href="/login" className="flex flex-col items-center gap-0.5" aria-label="Sign in">
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-[10px] text-gray-500 font-medium">My Account</span>
              </Link>
            )}
            <div className="relative">
              <CartIcon />
            </div>
          </div>
        </div>

        {/* 移动端搜索栏行 - 匹配截图 */}
        <div className="!block md:!hidden px-4 pb-3 bg-white">
          <form onSubmit={handleSearch} className="relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-blue-500">
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              name="q"
              className="block w-full bg-gray-100 border-none rounded-full py-2 !pl-12 pr-4 leading-5 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:bg-white sm:text-sm"
              placeholder="Search for t-shirts, hoodies, koozies, and..."
              aria-label="Search query"
            />
          </form>
        </div>

        {/* 桌面端头部布局 - 仅在 md 及以上屏幕显示 */}
        <div className="container !hidden md:!grid site-header__row">
          <div className="site-header__brand">
            <Link href="/" aria-label="Suvernire Plus home">
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
                <a className="value" href="tel:4169166352">
                  416 916 6352
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
                <Link className="value" href="/help#guestbook">
                  Chat now
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* 桌面端导航 - 仅在桌面端显示 */}
        <nav className="primary-nav primary-nav--desktop !hidden md:!block" aria-label="Primary">
          <div className="container primary-nav__inner">
            <ul className="mega">
              {/* 从 CMS 渲染导航菜单 */}
              {/* 隐藏 Custom Apparel 导航项 */}
              {navigation.length > 0 ? (
                navigation
                  .filter((item: NavigationMenuItem) => item.href !== '/collections/apparel') // 过滤掉 Custom Apparel
                  .sort((a: NavigationMenuItem, b: NavigationMenuItem) => (a.order || 0) - (b.order || 0))
                  .map((item: NavigationMenuItem) => renderNavigationItem(item))
              ) : (
                // 如果 CMS 数据为空，显示默认导航（向后兼容）
                <>
                  <li className="mega__item">
                    <Link href="/products" className="mega__trigger">Custom T-shirts</Link>
                  </li>
                  {/* 隐藏 Custom Apparel 导航项 */}
                  {/* <li className="mega__item">
                    <Link href="/collections/apparel" className="mega__trigger">Custom Apparel</Link>
                  </li> */}
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
              {/* 根据登录状态显示不同内容 */}
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

      {/* 移动端侧边抽屉菜单 */}
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
            {/* 使用 Souvenir Plus Inc 官方 logo */}
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
          {/* 从 CMS 渲染移动端导航菜单 */}
          {/* 隐藏 Custom Apparel 导航项 */}
          {navigation.length > 0 ? (
            navigation
              .filter((item: NavigationMenuItem) => item.href !== '/collections/apparel') // 过滤掉 Custom Apparel
              .sort((a: NavigationMenuItem, b: NavigationMenuItem) => (a.order || 0) - (b.order || 0))
              .map((item: NavigationMenuItem) => renderMobileNavigationItem(item))
          ) : (
            // 默认导航（向后兼容）
            <>
              <li>
                <Link href="/products" className="mobile-nav__link" onClick={() => setIsMobileMenuOpen(false)}>
                  Custom T-shirts
                </Link>
              </li>
              {/* 隐藏 Custom Apparel 导航项 */}
              {/* <li>
                <Link href="/collections/apparel" className="mobile-nav__link" onClick={() => setIsMobileMenuOpen(false)}>
                  Custom Apparel
                </Link>
              </li> */}
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

