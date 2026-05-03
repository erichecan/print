'use client';

import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

import { DatabaseCategoriesSection } from './DatabaseCategoriesSection';
import { InkerSupportSection } from './InkerSupportSection';
import TestimonialCarousel from '../TestimonialCarousel';

export function HomeClient() {
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const homePage = contentData?.data?.homePage;

  const heroTitle = homePage?.heroTitle || 'Custom Merch That Represents Your Group';
  const heroSubtitle = homePage?.heroSubtitle || 'Premium quality T-shirts, hoodies, hats & more — with expert design help, free shipping, and a 100% satisfaction guarantee.';

  return (
    <>
      {/* ── 1. Top Promo Banner ── */}
      <div className="promo-banner">
        <span>🚀 Free Shipping on All Orders &nbsp;·&nbsp; Rush Delivery Available &nbsp;·&nbsp; 100% Satisfaction Guaranteed</span>
      </div>

      {/* ── 2. Hero ── */}
      <section className="hp-hero" aria-labelledby="hero-heading">
        <div className="hp-hero__bg" aria-hidden="true" />
        <div className="container hp-hero__inner">
          <div className="hp-hero__text">
            <p className="hp-hero__eyebrow">Custom Merch for Teams &amp; Businesses</p>
            <h1 className="hp-hero__title" id="hero-heading">{heroTitle}</h1>
            <p className="hp-hero__subtitle">{heroSubtitle}</p>
            <div className="hp-hero__actions">
              <Link href="/design-lab" className="btn btn--xl">
                Start Designing Free
              </Link>
              <Link href="/products" className="btn btn--xl btn--ghost">
                Browse Products
              </Link>
            </div>
            <p className="hp-hero__note">No minimums · Free design review · Ships in 10–14 days</p>
          </div>
          <div className="hp-hero__media" aria-label="Featured products">
            <div className="hp-hero__media-grid">
              {[
                { src: '/assets/hero/hero-card-tee.jpg', alt: 'Custom T-shirt' },
                { src: '/assets/hero/hero-card-hat.jpg', alt: 'Custom Hat' },
                { src: '/assets/hero/hero-card-bottle.jpg', alt: 'Custom Bottle' },
                { src: '/assets/hero/hero-card-bag.jpg', alt: 'Custom Bag' },
              ].map((card) => (
                <div className="hp-hero-card" key={card.src}>
                  <Image src={card.src} alt={card.alt} width={440} height={320} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Trust Bar ── */}
      <section className="trust-bar" aria-label="Why choose us">
        <div className="container trust-bar__grid">
          {[
            { icon: '🏆', stat: '2,500+', label: 'Groups Served' },
            { icon: '🚚', stat: 'Free', label: 'Standard Shipping' },
            { icon: '✅', stat: '100%', label: 'Satisfaction Guarantee' },
            { icon: '⚡', stat: '3-Day', label: 'Rush Options Available' },
          ].map((item) => (
            <div className="trust-bar__item" key={item.label}>
              <span className="trust-bar__icon">{item.icon}</span>
              <div>
                <div className="trust-bar__stat">{item.stat}</div>
                <div className="trust-bar__label">{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 4. How It Works ── */}
      <section className="how-it-works" aria-labelledby="hiw-heading">
        <div className="container">
          <h2 id="hiw-heading" className="section-title">How It Works</h2>
          <p className="section-subtitle">From idea to delivery in three simple steps</p>
          <div className="hiw-steps">
            {[
              {
                step: '01',
                title: 'Pick Your Products',
                desc: 'Browse 200+ customizable items — tees, hoodies, hats, bags, drinkware and more.',
                icon: (
                  <svg viewBox="0 0 48 48" fill="none"><circle cx="24" cy="24" r="22" stroke="currentColor" strokeWidth="2.5"/><path d="M16 20h16M16 24h10M32 28H16" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                ),
              },
              {
                step: '02',
                title: 'Upload Your Design',
                desc: 'Add your logo, artwork, or let our design team create something stunning — free of charge.',
                icon: (
                  <svg viewBox="0 0 48 48" fill="none"><rect x="8" y="10" width="32" height="28" rx="4" stroke="currentColor" strokeWidth="2.5"/><path d="M17 30l5-7 4 5 3-3 5 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="18" cy="20" r="2.5" stroke="currentColor" strokeWidth="2"/></svg>
                ),
              },
              {
                step: '03',
                title: 'We Print & Ship',
                desc: 'We handle production and deliver directly to your door, with real-time order tracking.',
                icon: (
                  <svg viewBox="0 0 48 48" fill="none"><path d="M6 30h28V14H6v16z" stroke="currentColor" strokeWidth="2.5"/><path d="M34 20h6l4 8v6h-4" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/><circle cx="14" cy="36" r="4" stroke="currentColor" strokeWidth="2.5"/><circle cx="36" cy="36" r="4" stroke="currentColor" strokeWidth="2.5"/></svg>
                ),
              },
            ].map((item) => (
              <div className="hiw-step" key={item.step}>
                <div className="hiw-step__icon">{item.icon}</div>
                <div className="hiw-step__number">{item.step}</div>
                <h3 className="hiw-step__title">{item.title}</h3>
                <p className="hiw-step__desc">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Shop by Category ── */}
      <DatabaseCategoriesSection />

      {/* ── 6. Social Proof / Testimonials ── */}
      <TestimonialCarousel />

      {/* ── 7. Use Cases by Industry ── */}
      <section className="use-cases" aria-labelledby="usecases-heading">
        <div className="container">
          <h2 id="usecases-heading" className="section-title">Made for Every Occasion</h2>
          <p className="section-subtitle">From corporate teams to school events, we've got you covered</p>
          <div className="use-cases__grid">
            {[
              { label: 'Corporate & Business', icon: '🏢', href: '/products?use=corporate' },
              { label: 'Sports & Athletics', icon: '⚽', href: '/products?use=sports' },
              { label: 'Schools & Universities', icon: '🎓', href: '/products?use=schools' },
              { label: 'Events & Festivals', icon: '🎪', href: '/products?use=events' },
              { label: 'Non-Profits & Charity', icon: '❤️', href: '/products?use=nonprofit' },
              { label: 'Trade Shows & Promo', icon: '🎯', href: '/products?use=tradeshow' },
            ].map((item) => (
              <Link key={item.label} href={item.href} className="use-case-card">
                <span className="use-case-card__icon">{item.icon}</span>
                <span className="use-case-card__label">{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── 8. Rush Order CTA Banner ── */}
      <section className="rush-cta" aria-label="Rush order">
        <div className="container rush-cta__inner">
          <div className="rush-cta__text">
            <h2 className="rush-cta__title">Need It Fast?</h2>
            <p className="rush-cta__desc">Rush orders delivered in as little as 3 business days. Perfect for last-minute events and urgent orders.</p>
          </div>
          <Link href="/products" className="btn btn--xl btn--light">
            Order Rush Delivery
          </Link>
        </div>
      </section>

      {/* ── 9. Support & Pricing ── */}
      <InkerSupportSection />
    </>
  );
}
