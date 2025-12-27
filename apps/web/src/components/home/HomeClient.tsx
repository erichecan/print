/**
 * Home Client Component
 * [2025-01-28 06:35:00] Client component for homepage that fetches CMS content
 */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import useSWR from 'swr';
import { contentApi } from '@/lib/api';

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
  // [2025-01-29 13:50:00] 品牌logo列表 - 从Custom Ink爬取，存储在GCP前端服务的public目录
  // Logo路径使用相对路径，在生产环境会自动解析为前端服务URL
  // 例如：/assets/brands/nike.svg -> https://print-main-frontend-234065158862.us-central1.run.app/assets/brands/nike.svg
  const brandLogos = homePage?.brandLogos || [
    // Row 1 - 与Custom Ink品牌展示区域一致
    { id: 'brand-1', name: 'Nike', src: '/assets/brands/nike.svg' },
    { id: 'brand-2', name: 'Carhartt', src: '/assets/brands/carhartt.svg' },
    { id: 'brand-3', name: 'New Era', src: '/assets/brands/new-era.png' },
    { id: 'brand-4', name: 'The North Face', src: '/assets/brands/northface.svg' },
    { id: 'brand-5', name: 'Stanley', src: '/assets/brands/stanley.svg' },
    { id: 'brand-6', name: 'Patagonia', src: '/assets/brands/patagonia.svg' },
    { id: 'brand-7', name: 'Champion', src: '/assets/brands/champion.png' },
    // Row 2
    { id: 'brand-8', name: 'Comfort Colors', src: '/assets/brands/comfort-colors.svg' },
    { id: 'brand-9', name: 'Ogio', src: '/assets/brands/ogio.svg' },
    { id: 'brand-10', name: 'Peter Millar', src: '/assets/brands/peter-millar.svg' },
    { id: 'brand-11', name: 'TravisMathew', src: '/assets/brands/travismathew.svg' },
    { id: 'brand-12', name: 'Moleskine', src: '/assets/brands/moleskine.svg' },
    { id: 'brand-13', name: 'Richardson', src: '/assets/brands/richardson.png' },
    { id: 'brand-14', name: 'Koozie', src: '/assets/brands/koozie.svg' },
    // Row 3
    { id: 'brand-15', name: 'Gildan', src: '/assets/brands/gildan.png' },
    { id: 'brand-16', name: 'Adidas', src: '/assets/brands/adidas.png' },
    { id: 'brand-17', name: 'JBL', src: '/assets/brands/jbl.svg' },
    { id: 'brand-18', name: 'Herschel Supply Co.', src: '/assets/brands/herschel.svg' },
    { id: 'brand-19', name: 'BIC', src: '/assets/brands/bic.svg' },
    { id: 'brand-20', name: 'Hydro Flask', src: '/assets/brands/hydro-flask.png' },
    { id: 'brand-21', name: 'Columbia', src: '/assets/brands/columbia.png' },
  ];
  const testimonials = homePage?.testimonials || [
    { id: 'default-1', quote: 'Ordered with ease and delivered on time.', author: 'Mary B., NY', stars: 5 },
    { id: 'default-2', quote: 'Top quality, fast delivery, stellar support. Highly recommend!', author: 'Ingrid D., MD', stars: 5 },
    { id: 'default-3', quote: 'Great experience and responsive service. The site is easy to use.', author: 'Jenna F., WI', stars: 4 },
  ];
  const enterprisePanels = homePage?.enterprisePanels || [
    {
      id: 'default-1',
      title: 'Enterprise-Level Swag Management',
      description: 'Get custom kits, white-glove service, address collection, and global shipping with our enterprise solution.',
      ctaLabel: 'Get a Demo',
      ctaHref: '/contact',
    },
    {
      id: 'default-2',
      title: "We'll Do the Work",
      description: 'Ship to one place or every place. Choose your design and we handle the rest—from packing to delivery tracking.',
      ctaLabel: 'Start Designing',
      ctaHref: '/design-lab', // [2025-12-08 14:40:00] 使用新的 Design Lab 页面
      ctaVariant: 'outline',
    },
  ];

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <div className="container hero__grid">
          <div>
            <div style={{ marginBottom: '16px', fontSize: '16px', fontWeight: 600, color: '#333' }}>
              <span style={{ marginRight: '24px' }}>📞 416-916-6352</span>
              <span>✉️ dtfsouvenir@gmail.com</span>
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

      {/* [2025-01-30 10:00:00] 品牌合作区域 - 使用 frontend-design 美化 */}
      <section className="brands" aria-labelledby="brands-heading">
        <div className="container">
          <h2 id="brands-heading">
            Shop Featured Brands
          </h2>
          <div className="brands__grid">
            {brandLogos.map((brand, index) => (
              <div
                key={brand.id}
                className="brand-logo"
                role="listitem"
                aria-label={brand.name}
                style={{
                  animationDelay: `${index * 0.05}s`,
                  animation: 'fadeInUp 0.6s ease-out forwards',
                  opacity: 0
                }}
              >
                {/* [2025-01-29 13:50:00] 品牌logo从Custom Ink爬取，存储在GCP前端服务
                    路径使用相对路径，生产环境会自动解析为：https://print-main-frontend-234065158862.us-central1.run.app/assets/brands/xxx */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.src}
                  alt={brand.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  loading="lazy"
                  onError={(e) => {
                    // 如果图片加载失败，使用占位符
                    const target = e.target as HTMLImageElement;
                    target.src = '/assets/brands/nike.svg';
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="testimonials" aria-labelledby="testimonials-heading">
        <div className="container">
          <h2 id="testimonials-heading" style={{ textAlign: 'center', marginBottom: '32px' }}>
            Loved by teams big and small
          </h2>
          <div className="testimonials__grid">
            {testimonials.map((testimonial) => (
              <article className="testimonial-card" key={testimonial.id} aria-label="Customer testimonial">
                <div className="testimonial-card__stars" aria-hidden="true">
                  {Array.from({ length: testimonial.stars }).map((_, index) => (
                    <span key={index}>★</span>
                  ))}
                </div>
                <p>{testimonial.quote}</p>
                <footer>— {testimonial.author}</footer>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="enterprise" aria-labelledby="enterprise-heading">
        <div className="container">
          <h2 id="enterprise-heading" style={{ textAlign: 'center', marginBottom: '32px' }}>
            Enterprise services to scale your swag
          </h2>
          <div className="enterprise__grid">
            {enterprisePanels.map((panel) => (
              <div className="enterprise-card" key={panel.id}>
                <h3>{panel.title}</h3>
                <p>{panel.description}</p>
                <Link className={`btn${panel.ctaVariant === 'outline' ? ' btn--outline' : ''}`} href={panel.ctaHref}>
                  {panel.ctaLabel}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

