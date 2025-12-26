/**
 * Database Categories Section Component
 * [2025-11-19] 使用数据库分类数据，动态映射到本地图片资源
 */
'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { categoriesApi, Category } from '@/lib/api';
import styles from './StaticCategoriesSection.module.css';

// 分类名称到图片文件的映射函数
const getCategoryImagePath = (category: Category): string => {
  const slugToImageMap: Record<string, string> = {
    't-shirts': '/assets/categories/cat-tshirt.png',
    'sweatshirts': '/assets/categories/cat-sweatshirt.png',
    'hoodies': '/assets/categories/cat-sweatshirt.png',
    'hats': '/assets/categories/cat-hat.png',
    'caps': '/assets/categories/cat-hat.png',
    'bags': '/assets/categories/cat-bag.png',
    'drinkware': '/assets/categories/cat-drinkware.png',
    'mugs': '/assets/categories/cat-drinkware.png',
    'tech': '/assets/categories/cat-tech.png',
    'tech-accessories': '/assets/categories/cat-tech.png',
    'office': '/assets/categories/cat-office.png',
    'office-supplies': '/assets/categories/cat-office.png',
    'activewear': '/assets/categories/cat-activewear.png',
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

// 获取分类描述的函数
const getCategoryDescription = (category: Category): string => {
  if (category.description) {
    return category.description;
  }

  const defaultDescriptions: Record<string, string> = {
    't-shirts': 'Custom T-shirts for every occasion',
    'sweatshirts': 'Comfortable and customizable hoodies',
    'hoodies': 'Comfortable and customizable hoodies',
    'hats': 'Custom hats and caps',
    'caps': 'Custom hats and caps',
    'bags': 'Tote bags and backpacks',
    'drinkware': 'Custom mugs and water bottles',
    'mugs': 'Custom mugs and water bottles',
    'tech': 'Phone cases and tech gadgets',
    'tech-accessories': 'Phone cases and tech gadgets',
    'office': 'Custom office essentials',
    'office-supplies': 'Custom office essentials',
    'activewear': 'Performance and athletic wear',
    'jackets': 'Custom outerwear',
    'jacket-vest': 'Custom outerwear',
    'vests': 'Custom outerwear',
    'polo': 'Professional apparel',
    'polo-business': 'Professional apparel',
    'business': 'Professional apparel',
    'trade-show': 'Event and trade show materials',
    'tradeshow': 'Event and trade show materials',
    'workwear': 'Durable work uniforms',
    'uniforms': 'Durable work uniforms'
  };

  return defaultDescriptions[category.slug] || 'Custom products for your needs';
};

export function DatabaseCategoriesSection() {
  const { data, error, isLoading } = useSWR('categories', () => categoriesApi.list());

  if (isLoading) {
    return (
      <section className={styles.staticCategories} aria-labelledby="database-categories-heading">
        <div className="container">
          <h2 id="database-categories-heading" className={styles.sectionTitle}>
            Shop by Category
          </h2>
          <p className={styles.sectionSubtitle}>
            Find the perfect custom products for your team, event, or business
          </p>

          <div className={styles.staticCategoriesGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.categoryCard} style={{ opacity: 0.5 }}>
                <div className={styles.categoryCardImage} style={{ backgroundColor: '#f3f4f6' }} />
                <div className={styles.categoryCardContent}>
                  <h3 className={styles.categoryCardLabel}>Loading...</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (error || !data?.data || data.data.length === 0) {
    return (
      <section className={styles.staticCategories} aria-labelledby="database-categories-heading">
        <div className="container">
          <h2 id="database-categories-heading" className={styles.sectionTitle}>
            Shop by Category
          </h2>
          <p className={styles.sectionSubtitle}>
            Find the perfect custom products for your team, event, or business
          </p>
          <div className="text-center text-gray-600 py-8">
            Failed to load categories. Please try again later.
          </div>
        </div>
      </section>
    );
  }

  const categories = data.data;

  return (
    <section className={styles.staticCategories} aria-labelledby="database-categories-heading">
      <div className="container">
        <h2 id="database-categories-heading" className={styles.sectionTitle}>
          Shop by Category
        </h2>
        <p className={styles.sectionSubtitle}>
          Find the perfect custom products for your team, event, or business
        </p>

        <div className={styles.staticCategoriesGrid}>
          {categories.map((category: Category) => {
            // 优先使用数据库中的imageUrl，如果没有则使用映射函数
            const imagePath = category.imageUrl || getCategoryImagePath(category);
            const description = getCategoryDescription(category);

            return (
              <Link
                key={category.id}
                href={`/products?category=${category.slug}`}
                className={styles.categoryCard}
                aria-label={`Browse ${category.name}`}
              >
                <div className={styles.categoryCardImage}>
                  {/* [2025-01-29 23:50:00] 使用普通 img 标签避免 Next.js Image 优化器 400 错误 */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePath}
                    alt={category.name}
                    className={styles.categoryImage}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      // 如果图片加载失败，使用备用图片
                      const target = e.target as HTMLImageElement;
                      target.src = '/assets/categories/cat-tshirt.png';
                    }}
                  />
                </div>
                <div className={styles.categoryCardContent}>
                  <h3 className={styles.categoryCardLabel}>{category.name}</h3>
                  {description && (
                    <p className={styles.categoryCardDescription}>{description}</p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        <div className={styles.staticCategoriesCta}>
          <Link href="/products" className={`${styles.btn} ${styles.btnPrimary}`}>
            View All Products
          </Link>
        </div>
      </div>
    </section>
  );
}