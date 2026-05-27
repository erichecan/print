/**
 * Home Mobile Client Component
* 移动端专用首页组件，参考 Custom Ink 移动端设计
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';
import useSWR from 'swr';
import { contentApi, categoriesApi, Category } from '@/lib/api';

// 分类名称到图片文件的映射函数（与桌面端保持一致）
const getCategoryImagePath = (category: Category): string => {
  const name = category.name.toLowerCase();
  const slug = category.slug.toLowerCase();

  const slugToImageMap: Record<string, string> = {
    't-shirt': '/assets/categories/cat-tshirt.png',
    'tee': '/assets/categories/cat-tshirt.png',
    'sweatshirt': '/assets/categories/cat-sweatshirt.png',
    'hoodie': '/assets/categories/cat-sweatshirt.png',
    'sweater': '/assets/categories/cat-sweatshirt.png',
    'hat': '/assets/categories/cat-hat.png',
    'cap': '/assets/categories/cat-hat.png',
    'bag': '/assets/categories/cat-bag.png',
    'tote': '/assets/categories/cat-bag.png',
    'drinkware': '/assets/categories/cat-drinkware.png',
    'mug': '/assets/categories/cat-drinkware.png',
    'bottle': '/assets/categories/cat-drinkware.png',
    'cup': '/assets/categories/cat-drinkware.png',
    'tech': '/assets/categories/cat-tech.png',
    'office': '/assets/categories/cat-office.png',
    'active': '/assets/categories/cat-activewear.png',
    'athletic': '/assets/categories/cat-activewear.png',
    'jacket': '/assets/categories/cat-jacket-vest.png',
    'vest': '/assets/categories/cat-jacket-vest.png',
    'polo': '/assets/categories/cat-polo-business.png',
    'business': '/assets/categories/cat-polo-business.png',
    'trade': '/assets/categories/cat-trade-show.png',
    'sign': '/assets/categories/cat-trade-show.png',
    'work': '/assets/categories/cat-workwear.png',
    'uniform': '/assets/categories/cat-workwear.png'
  };

  // 1. Try exact slug match
  if (slugToImageMap[slug]) return slugToImageMap[slug];

  // 2. Try partial name/slug match against keys
  for (const [key, imagePath] of Object.entries(slugToImageMap)) {
    if (name.includes(key) || slug.includes(key)) {
      return imagePath;
    }
  }

  // 默认图片
  return '/assets/categories/cat-tshirt.png';
};

export function HomeMobileClient() {
  // 从 CMS 获取首页内容
  const { data: contentData } = useSWR('public-content-config', contentApi.get);
  const homePage = contentData?.data?.homePage;

  // 从数据库获取分类数据
  const { data: categoriesData, error: categoriesError, isLoading: categoriesLoading } = useSWR(
    'categories',
    () => categoriesApi.list()
  );

  // 使用 CMS 数据或默认值
  const heroTitle = homePage?.heroTitle || 'Custom T-shirts & Promo Gear for Your Group';
  const heroSubtitle = homePage?.heroSubtitle || 'From tees to tech, create premium swag with expert help, fast delivery, and a 100% satisfaction guarantee.';

  // 使用数据库分类数据，如果没有则使用默认值
  const serverCategories = categoriesData?.data;
  const categories = (serverCategories && serverCategories.length > 0)
    ? serverCategories.map((category: Category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      image: category.imageUrl && category.imageUrl.startsWith('http')
        ? category.imageUrl
        : getCategoryImagePath(category),
    }))
    : (homePage as any)?.categories || [
      { id: 'cat-1', name: 'T-shirts', slug: 't-shirts', image: '/assets/categories/cat-tshirt.png' },
      { id: 'cat-2', name: 'Sweatshirts', slug: 'sweatshirts', image: '/assets/categories/cat-sweatshirt.png' },
      { id: 'cat-3', name: 'Hats', slug: 'hats', image: '/assets/categories/cat-hat.png' },
      { id: 'cat-4', name: 'Jackets & Vests', slug: 'jackets', image: '/assets/categories/cat-jacket-vest.png' },
      { id: 'cat-5', name: 'Bags', slug: 'bags', image: '/assets/categories/cat-bag.png' },
      { id: 'cat-6', name: 'Drinkware', slug: 'drinkware', image: '/assets/categories/cat-drinkware.png' },
      { id: 'cat-7', name: 'Polos', slug: 'polo', image: '/assets/categories/cat-polo-business.png' },
      { id: 'cat-8', name: 'Workwear', slug: 'workwear', image: '/assets/categories/cat-workwear.png' },
      { id: 'cat-9', name: 'Office', slug: 'office', image: '/assets/categories/cat-office.png' },
      { id: 'cat-10', name: 'Tech', slug: 'tech', image: '/assets/categories/cat-tech.png' },
      { id: 'cat-11', name: 'Signage', slug: 'trade-show', image: '/assets/categories/cat-trade-show.png' },
      { id: 'cat-12', name: 'Activewear', slug: 'activewear', image: '/assets/categories/cat-activewear.png' },
    ];

  // 品牌 logo（9个，3行3列）
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
      {/* Hero 区域 - 重新设计匹配截图 */}
      <section className="bg-white">
        {/* 图片放在最上方，不遮挡文字 */}
        <div className="relative w-full aspect-[4/3] bg-[#f0f9fa] overflow-hidden">
          <Image
            src="https://storage.googleapis.com/print-482914-images/home/hero-mobile-new.webp"
            alt="Custom products collection"
            fill
            className="object-contain p-4"
            unoptimized
            priority
          />
        </div>

        <div className="px-6 py-8 text-center flex flex-col gap-6">
          <div className="space-y-3">
            <h1 className="text-[32px] md:text-4xl font-extrabold text-gray-900 leading-tight tracking-tight">
              Design Easily.<br />Order Confidently.
            </h1>
            <p className="text-lg text-gray-600 leading-relaxed max-w-[280px] mx-auto">
              Add your company logo to custom t-shirts and promo products
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-2">
            <Link
              href="/products"
              className="w-full py-4 px-[15px] bg-[#1a47e5] text-white rounded-md font-bold text-lg hover:bg-blue-700 transition-colors shadow-sm text-left"
            >
              Get Started
            </Link>
            <Link
              href="/help#satisfaction"
              className="w-full py-4 px-[15px] bg-[#ff4d00] text-white rounded-md font-bold text-lg hover:bg-orange-600 transition-colors shadow-sm text-left"
            >
              100% Satisfaction Guarantee
            </Link>
          </div>
        </div>
      </section>

      {/* 产品分类网格 - 12个分类，4行3列 */}
      <section className="home-mobile__categories">
        <div className="home-mobile__container">
          <h2 className="home-mobile__section-title">
            Custom T-shirts & Promotional Products for Your Group
          </h2>
          <div className="home-mobile__categories-grid">
            {categories.map((category: { id: string; name: string; slug: string; image: string }) => (
              <Link
                key={category.id}
                href={`/products?category=${category.slug || category.id}`}
                className="home-mobile__category-card"
              >
                <div className="home-mobile__category-image">
                  <Image
                    src={category.image}
                    alt={category.name}
                    fill
                    unoptimized
                    style={{ objectFit: 'cover' }}
                    onError={() => {
                      // Placeholder logic handled by initial data or separate component state if needed
                    }}
                  />
                </div>
                <div className="home-mobile__category-name">{category.name}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 重新设计的支持和价格部分 - 参考图 2 */}
      <section className="bg-[#f8f9fa] py-8 px-4 space-y-6">
        {/* Support Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="flex gap-4 items-start mb-6">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
              <Image
                src="https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&h=200&q=80"
                alt="Support Agent"
                width={64}
                height={64}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="pt-1">
              <h2 className="text-xl font-bold text-gray-900 mb-2">An Inker By Your Side</h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Need help with your order? Get personalized support from our expert team as your partner from design to delivery.
              </p>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 mb-4">How An Inker Can Help</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-orange-600 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.47a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.47a2 2 0 00-1.34-2.23z" /></svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Product Selection</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-orange-600 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Design Assistance</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-orange-600 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 00-3-3.87" /><path d="M16 3.13a4 4 0 010 7.75" /></svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Group Orders</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 text-orange-600 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
                </div>
                <span className="text-sm font-medium text-gray-700">Order Support</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <a href="tel:855-271-2660" className="flex items-center justify-center gap-2 w-full py-3 border-2 border-blue-600 rounded-lg text-blue-700 font-bold hover:bg-blue-50 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.12 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" /></svg>
              855-271-2660
            </a>
            <button
              type="button"
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-blue-600 rounded-lg text-blue-700 font-bold hover:bg-blue-50 transition-colors"
              onClick={() => (window as any).Tawk_API?.maximize()}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" /></svg>
              Chat Now
            </button>
            <Link href="/contact" className="flex items-center justify-center gap-2 w-full py-3 border-2 border-blue-600 rounded-lg text-blue-700 font-bold hover:bg-blue-50 transition-colors">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></svg>
              Email Us
            </Link>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
          <div className="mb-6">
            <div className="text-[10px] uppercase tracking-wider font-bold text-gray-600 mb-1">All-in Pricing</div>
            <h2 className="text-2xl font-bold text-gray-900">Your Price Includes</h2>
          </div>

          <ul className="space-y-4 mb-8">
            {[
              'No setup fees',
              'FREE design review',
              'FREE standard shipping',
              'Exclusive artwork & fonts',
              'Expert help, 7 days a week',
              '100% satisfaction guarantee'
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-3 text-sm text-gray-700 font-medium">
                <div className="w-5 h-5 rounded-full border-2 border-orange-500 flex items-center justify-center text-orange-500 flex-shrink-0">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                </div>
                {item}
              </li>
            ))}
          </ul>

          <Link href="/products" className="block w-full py-3.5 border-2 border-blue-600 rounded-lg text-blue-700 font-bold text-center hover:bg-blue-50 transition-colors">
            Learn More
          </Link>
        </div>
      </section>

      {/* 客户评价区域 */}
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

