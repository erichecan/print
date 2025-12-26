/**
 * Home Mobile Client Component
 * [2025-01-29 04:00:00] 移动端专用首页组件，参考 Custom Ink 移动端设计
 */
'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { contentApi, categoriesApi, Category } from '@/lib/api';

// [2025-01-29 23:15:00] 分类名称到图片文件的映射函数（与桌面端保持一致）
const getCategoryImagePath = (category: Category): string => {
  const slugToImageMap: Record<string, string> = {
    't-shirts': '/assets/categories/cat-tshirt.png',
    'short-sleeve-t-shirts': '/assets/categories/cat-tshirt.png',
    'long-sleeve-t-shirts': '/assets/categories/cat-tshirt.png',
    'sweatshirts': '/assets/categories/cat-sweatshirt.png',
    'hoodies': '/assets/categories/cat-sweatshirt.png',
    'crewneck-sweatshirts': '/assets/categories/cat-sweatshirt.png',
    'kids-sweats': '/assets/categories/cat-sweatshirt.png',
    'hats': '/assets/categories/cat-hat.png',
    'caps': '/assets/categories/cat-hat.png',
    'bags': '/assets/categories/cat-bag.png',
    'tote-bags': '/assets/categories/cat-bag.png',
    'drinkware': '/assets/categories/cat-drinkware.png',
    'mugs': '/assets/categories/cat-drinkware.png',
    'tech': '/assets/categories/cat-tech.png',
    'tech-accessories': '/assets/categories/cat-tech.png',
    'office': '/assets/categories/cat-office.png',
    'office-supplies': '/assets/categories/cat-office.png',
    'activewear': '/assets/categories/cat-activewear.png',
    'athleticwear': '/assets/categories/cat-activewear.png',
    'jackets': '/assets/categories/cat-jacket-vest.png',
    'jacket-vest': '/assets/categories/cat-jacket-vest.png',
    'vests': '/assets/categories/cat-jacket-vest.png',
    'polo': '/assets/categories/cat-polo-business.png',
    'polo-business': '/assets/categories/cat-polo-business.png',
    'business': '/assets/categories/cat-polo-business.png',
    'trade-show': '/assets/categories/cat-trade-show.png',
    'tradeshow': '/assets/categories/cat-trade-show.png',
    'workwear': '/assets/categories/cat-workwear.png',
    'uniforms': '/assets/categories/cat-workwear.png'
  };

  // 首先尝试根据 slug 匹配
  if (slugToImageMap[category.slug]) {
    return slugToImageMap[category.slug];
  }

  // 然后尝试根据名称的部分匹配
  const name = category.name.toLowerCase();
  for (const [key, imagePath] of Object.entries(slugToImageMap)) {
    if (name.includes(key.replace('-', ' ')) || name.includes(key)) {
      return imagePath;
    }
  }

  // 如果都没匹配到，使用默认图片
  return '/assets/categories/cat-tshirt.png';
};

export function HomeMobileClient() {
  // [2025-01-29 04:00:00] 从 CMS 获取首页内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const homePage = contentData?.data?.homePage;

  // [2025-01-29 23:15:00] 从数据库获取分类数据
  const { data: categoriesData, error: categoriesError, isLoading: categoriesLoading } = useSWR(
    'categories',
    () => categoriesApi.list()
  );

  // [2025-01-29 04:00:00] 使用 CMS 数据或默认值
  const heroTitle = homePage?.heroTitle || 'Custom T-shirts & Promo Gear for Your Group';
  const heroSubtitle = homePage?.heroSubtitle || 'From tees to tech, create premium swag with expert help, fast delivery, and a 100% satisfaction guarantee.';

  // [2025-01-29 23:15:00] 使用数据库分类数据，如果没有则使用默认值
  const categories = categoriesData?.data?.length > 0
    ? categoriesData.data.map((category: Category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.imageUrl || getCategoryImagePath(category),
    }))
    : homePage?.categories || [
      { id: 'cat-1', name: 'T-shirts', slug: 't-shirts', image: '/assets/categories/cat-tshirt.png' },
      { id: 'cat-2', name: 'Hoodies & Sweatshirts', slug: 'sweatshirts', image: '/assets/categories/cat-sweatshirt.png' },
      { id: 'cat-3', name: 'Hats', slug: 'hats', image: '/assets/categories/cat-hat.png' },
      { id: 'cat-4', name: 'Jackets & Vests', slug: 'jackets', image: '/assets/categories/cat-jacket-vest.png' },
      { id: 'cat-5', name: 'Bags', slug: 'bags', image: '/assets/categories/cat-bag.png' },
      { id: 'cat-6', name: 'Drinkware', slug: 'drinkware', image: '/assets/categories/cat-drinkware.png' },
      { id: 'cat-7', name: 'Polos & Business Wear', slug: 'polo', image: '/assets/categories/cat-polo-business.png' },
      { id: 'cat-8', name: 'Workwear and Uniforms', slug: 'workwear', image: '/assets/categories/cat-workwear.png' },
      { id: 'cat-9', name: 'Office Supplies', slug: 'office', image: '/assets/categories/cat-office.png' },
      { id: 'cat-10', name: 'Technology', slug: 'tech', image: '/assets/categories/cat-tech.png' },
      { id: 'cat-11', name: 'Trade Show & Signage', slug: 'trade-show', image: '/assets/categories/cat-trade-show.png' },
      { id: 'cat-12', name: 'Athleticwear', slug: 'activewear', image: '/assets/categories/cat-activewear.png' },
    ];

  // [2025-01-29 04:00:00] 品牌 logo（9个，3行3列）
  const brandLogos = homePage?.brandLogos || [
    { id: 'brand-1', name: 'Nike', src: '/assets/brands/nike.svg' },
    { id: 'brand-2', name: 'Carhartt', src: '/assets/brands/carhartt.svg' },
    { id: 'brand-3', name: 'The North Face', src: '/assets/brands/northface.svg' },
    { id: 'brand-4', name: 'Ogio', src: '/assets/brands/ogio.svg' },
    { id: 'brand-5', name: 'New Era', src: '/assets/brands/new-era.png' },
    { id: 'brand-6', name: 'Patagonia', src: '/assets/brands/patagonia.svg' },
    { id: 'brand-7', name: 'Adidas', src: '/assets/brands/adidas.png' },
    { id: 'brand-8', name: 'New Era', src: '/assets/brands/new-era.png' },
    { id: 'brand-9', name: 'Gildan', src: '/assets/brands/gildan.png' },
  ];

  const testimonials = homePage?.testimonials || [
    { id: 'default-1', quote: 'My experience with ordering wasn\'t hard.', author: 'Cornelia S., CEO, All Smiles Entertainment, LLC, Chicago', stars: 5 },
    { id: 'default-2', quote: 'Ordered with ease and delivered on time.', author: 'Mary B., NY', stars: 5 },
    { id: 'default-3', quote: 'Top quality, fast delivery, stellar support. Highly recommend!', author: 'Ingrid D., MD', stars: 5 },
  ];

  return (
    <div className="home-mobile">
      {/* [2025-01-29 12:00:00] Hero 区域 - 使用 canvas-design 创建的渐变背景 */}
      <section className="home-mobile__hero">
        <div className="home-mobile__hero-background">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/hero/hero-mobile-gradient.png"
            alt="Hero background"
            className="home-mobile__hero-bg-image"
          />
        </div>
        <div className="home-mobile__hero-content">
          <h1 className="home-mobile__hero-title">10% OFF EVERYTHING</h1>
          <p className="home-mobile__hero-subtitle">Gear up for gifting season</p>
          <p className="home-mobile__hero-detail">
            Get 10% off sitewide through Dec 8th. Code TENOFF automatically applies at checkout. Conditions apply.
          </p>
          <Link href="/products" className="home-mobile__btn home-mobile__btn--primary">
            Get Started
          </Link>
        </div>
      </section>

      {/* [2025-01-29 04:00:00] 产品分类网格 - 12个分类，4行3列 */}
      <section className="home-mobile__categories">
        <div className="home-mobile__container">
          <h2 className="home-mobile__section-title">
            Custom T-shirts & Promotional Products for Your Group
          </h2>
          <div className="home-mobile__categories-grid">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug || category.id}`}
                className="home-mobile__category-card"
              >
                <div className="home-mobile__category-image">
                  {/* [2025-01-29 23:30:00] 使用普通 img 标签避免 Next.js Image 优化器 400 错误 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={category.image}
                    alt={category.name}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      // 如果图片加载失败，使用备用图片
                      const target = e.target as HTMLImageElement;
                      target.src = '/assets/categories/cat-tshirt.png';
                    }}
                  />
                </div>
                <div className="home-mobile__category-name">{category.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* [2025-01-29 04:00:00] 新到货和 Swag 管理区域 */}
      <section className="home-mobile__new-arrivals">
        <div className="home-mobile__container">
          <div className="home-mobile__new-arrivals-grid">
            <div className="home-mobile__new-arrivals-image">
              {/* [2025-01-29 23:30:00] 使用普通 img 标签避免 Next.js Image 优化器 400 错误 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/assets/hero/hero-card-tee.jpg"
                alt="New Arrivals"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div className="home-mobile__new-arrivals-card">
              <h3 className="home-mobile__new-arrivals-title">New Arrivals Are Here</h3>
              <Link href="/products" className="home-mobile__btn home-mobile__btn--outline">
                Shop Now
              </Link>
            </div>
          </div>
          <div className="home-mobile__enterprise-card">
            <div className="home-mobile__enterprise-logo">⚡</div>
            <h3 className="home-mobile__enterprise-title">Enterprise Level Swag Management</h3>
            <Link href="/contact" className="home-mobile__btn home-mobile__btn--primary">
              Get A Demo
            </Link>
          </div>
        </div>
      </section>

      {/* [2025-01-29 04:00:00] Shop Featured Brands - 9个品牌，3行3列 */}
      <section className="home-mobile__brands">
        <div className="home-mobile__container">
          <h2 className="home-mobile__section-title">Shop Featured Brands</h2>
          <div className="home-mobile__brands-grid">
            {brandLogos.map((brand) => (
              <div key={brand.id} className="home-mobile__brand-logo">
                {/* [2025-01-29 23:20:00] 使用普通 img 标签避免 Next.js Image 优化器 400 错误 */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={brand.src}
                  alt={brand.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
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

      {/* [2025-01-29 04:00:00] "An Inker By Your Side" 支持区域 */}
      <section className="home-mobile__support">
        <div className="home-mobile__container">
          <div className="home-mobile__support-card">
            <div className="home-mobile__support-avatar">
              <div className="home-mobile__support-avatar-placeholder">👤</div>
            </div>
            <h3 className="home-mobile__support-title">An Inker By Your Side</h3>
            <p className="home-mobile__support-description">
              Expert support for Product Selection, Design Assistance, Group Orders, and Order Support.
            </p>
            <div className="home-mobile__support-actions">
              <a href="tel:4169166352" className="home-mobile__support-link">
                📞 416 916 6352
              </a>
              <Link href="/help#guestbook" className="home-mobile__btn home-mobile__btn--outline">
                Chat Now
              </Link>
              <Link href="/contact" className="home-mobile__btn home-mobile__btn--outline">
                Email Us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* [2025-01-29 04:00:00] "Your Price Includes" 区域 */}
      <section className="home-mobile__price-includes">
        <div className="home-mobile__container">
          <h2 className="home-mobile__section-title">Your Price Includes</h2>
          <div className="home-mobile__price-features">
            <div className="home-mobile__price-feature">✓ No setup fees</div>
            <div className="home-mobile__price-feature">✓ Free design review</div>
            <div className="home-mobile__price-feature">✓ Free standard shipping</div>
            <div className="home-mobile__price-feature">✓ Exclusive artwork & fonts</div>
            <div className="home-mobile__price-feature">✓ Expert help 7 days a week</div>
            <div className="home-mobile__price-feature">✓ 100% satisfaction guarantee</div>
          </div>
          <Link href="/help" className="home-mobile__btn home-mobile__btn--outline">
            Learn More
          </Link>
        </div>
      </section>

      {/* [2025-01-29 04:00:00] 客户评价区域 */}
      <section className="home-mobile__testimonials">
        <div className="home-mobile__container">
          <h2 className="home-mobile__section-title">What Our Customers Say</h2>
          <div className="home-mobile__testimonials-list">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="home-mobile__testimonial-card">
                <div className="home-mobile__testimonial-stars">
                  {Array.from({ length: testimonial.stars }).map((_, index) => (
                    <span key={index}>★</span>
                  ))}
                </div>
                <p className="home-mobile__testimonial-quote">&ldquo;{testimonial.quote}&rdquo;</p>
                <footer className="home-mobile__testimonial-author">— {testimonial.author}</footer>
              </div>
            ))}
          </div>
          <Link href="/testimonials" className="home-mobile__btn home-mobile__btn--outline">
            See All Reviews
          </Link>
        </div>
      </section>
    </div>
  );
}

