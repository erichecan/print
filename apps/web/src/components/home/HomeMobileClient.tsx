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

