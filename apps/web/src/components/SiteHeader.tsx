/**
 * Site Header component
 * [2025-11-11 23:56:10] Migrated marketing header layout from prototype into Next.js
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent } from 'react';
import { CartIcon } from '@/components/CartIcon';

export function SiteHeader() {
  const router = useRouter();

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

  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <div className="top-message-bar" role="region" aria-label="Promotional message">
        Custom T-shirts & Promotional Products • Fast & Free Shipping • All-inclusive Pricing
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
            <div className="primary-nav__links">
              <Link href="/products">Custom T-shirts</Link>
              <Link href="/collections/apparel">Custom Apparel</Link>
              <Link href="/collections/promotional-products">Promotional Products</Link>
              <Link href="/design-lab">Design Lab</Link>
              <Link href="/help">Groups & Events</Link>
            </div>
            <div className="primary-nav__actions">
              <Link href="/login">
                <Image src="/assets/icon-person.svg" alt="" width={20} height={20} aria-hidden="true" />
                <span>Sign in</span>
              </Link>
              <CartIcon />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
}

