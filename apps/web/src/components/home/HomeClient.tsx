/**
 * Home Client Component
 * [2025-01-28 06:35:00] Client component for homepage that fetches CMS content
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

import { DatabaseCategoriesSection } from './DatabaseCategoriesSection';
import { InkerSupportSection } from './InkerSupportSection';
import TestimonialCarousel from '../TestimonialCarousel';

export function HomeClient() {
  // [2025-01-28 06:35:00] 从 CMS 获取首页内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const homePage = contentData?.data?.homePage;

  // [2025-01-28 06:35:00] 使用 CMS 数据或默认值（向后兼容）
  const heroTitle = homePage?.heroTitle || 'Custom T-shirts & Promo Gear for Your Group';
  const heroSubtitle = homePage?.heroSubtitle || 'From tees to tech, create premium swag with expert help, fast delivery, and a 100% satisfaction guarantee.';
  const heroCards = homePage?.heroCards || [
    { id: 'default-1', src: '/assets/hero/hero-card-tee.jpg', alt: 'Featured Tee' },
    { id: 'default-2', src: '/assets/hero/hero-card-bottle.jpg', alt: 'Featured Bottle' },
    { id: 'default-3', src: '/assets/hero/hero-card-hat.jpg', alt: 'Featured Hat' },
    { id: 'default-4', src: '/assets/hero/hero-card-bag.jpg', alt: 'Featured Bag' },
  ];
  const servicePromises = homePage?.servicePromises || [
    { id: 'default-1', title: 'Free Shipping', detail: '2-week delivery' },
    { id: 'default-2', title: '100% Satisfaction', detail: "We'll make it right" },
    { id: 'default-3', title: 'Design Help', detail: '7 days a week' },
    { id: 'default-4', title: 'Rush Options', detail: 'As fast as 3 days' },
  ];

  const testimonials = homePage?.testimonials || [
    { id: 'default-1', quote: 'Ordered with ease and delivered on time.', author: 'Mary B., NY', stars: 5 },
    { id: 'default-2', quote: 'Top quality, fast delivery, stellar support. Highly recommend!', author: 'Ingrid D., MD', stars: 5 },
    { id: 'default-3', quote: 'Great experience and responsive service. The site is easy to use.', author: 'Jenna F., WI', stars: 4 },
  ];


  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container hero__grid">
          <div>
            <div style={{ marginBottom: '20px', fontSize: '30px', fontWeight: 700, color: '#1f2937', whiteSpace: 'nowrap', display: 'flex', gap: '30px', alignItems: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                416-916-6352
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                dtfsouvenir@gmail.com
              </span>
            </div>
            <h1 className="hero__title" id="hero-heading">
              {heroTitle}
            </h1>
            <p className="hero__subtitle">
              {heroSubtitle}
            </p>
            <div className="hero__actions">
              {/* [2025-01-28 20:05:00] 使用和商品详情页相同的设计链接格式 */}
              <Link className="btn" href="/design-lab">
                Start Designing
              </Link>
              <Link className="btn btn--outline" href="/products">
                Browse Products
              </Link>
              {/* [2025-11-15 15:21:40] Provide entry point to offline order intake */}
              <Link className="btn btn--outline" href="/offline-orders">
                Submit Offline Order
              </Link>
            </div>
          </div>
          <div className="hero__media" aria-label="Featured product categories">
            {heroCards.map((card) => (
              <div className="hero-card" key={card.id}>
                <Image src={card.src} alt={card.alt} width={420} height={300} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* [2025-01-30 10:15:00] 服务承诺区域 - 添加图标 */}
      <section className="promises" aria-label="Service promises">
        <div className="container promises__grid">
          {servicePromises.map((promise) => {
            // [2025-01-30 10:15:00] 根据标题选择对应的图标
            const getIcon = (title: string) => {
              const titleLower = title.toLowerCase();
              if (titleLower.includes('shipping') || titleLower.includes('delivery')) {
                return (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zM6 18.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm13.5-9l1.96 2.5H17V9.5h2.5zm-1.5 9c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z" fill="currentColor" />
                  </svg>
                );
              } else if (titleLower.includes('satisfaction') || titleLower.includes('guarantee')) {
                return (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                  </svg>
                );
              } else if (titleLower.includes('design') || titleLower.includes('help')) {
                return (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                    <path d="M12 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="currentColor" />
                  </svg>
                );
              } else if (titleLower.includes('rush') || titleLower.includes('fast') || titleLower.includes('days')) {
                return (
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" fill="currentColor" />
                  </svg>
                );
              }
              // 默认图标
              return (
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor" />
                </svg>
              );
            };

            return (
              <div className="promise-card" key={promise.id}>
                <div className="promise-card__icon" aria-hidden="true">
                  {getIcon(promise.title)}
                </div>
                <div>
                  <div className="promise-card__label">{promise.title}</div>
                  <div className="promise-card__detail">{promise.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* [2025-01-29 04:00:00] Shop by Category moved up */}
      <DatabaseCategoriesSection />

      {/* [2025-01-30 04:30:00] Replaced static testimonials with dynamic carousel from Amazon reviews */}
      <TestimonialCarousel />

      {/* [2025-12-28 20:05:00] Inker Support Section (Replicated from Custom Ink) */}
      <InkerSupportSection />


    </>
  );
}

