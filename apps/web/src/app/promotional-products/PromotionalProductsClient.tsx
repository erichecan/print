/**
 * 促销产品页面客户端组件
* 显示 Hero 区域、类别网格和联系信息
* 移除 FAQ 部分，已移动到帮助中心页面
 */
'use client';

import Link from 'next/link';
import { getSortedCategories, type PromotionalCategory } from '@/data/promotional-categories';
import styles from './promotional-products.module.css';

/**
 * 获取图片路径，如果本地图片不存在则使用备用图片
* 辅助函数，处理图片路径和备用方案
 */
function getCategoryImagePath(category: PromotionalCategory): string {
  // 首先尝试使用爬取的图片路径
  if (category.imagePath) {
    return category.imagePath;
  }

  // 备用：使用现有的分类图片
  const fallbackMap: Record<string, string> = {
    'drinkware': '/assets/categories/cat-drinkware.png',
    'bags': '/assets/categories/cat-bag.png',
    'pens-office': '/assets/categories/cat-office.png',
    'technology': '/assets/categories/cat-tech.png',
  };

  return fallbackMap[category.slug] || '/assets/categories/cat-tshirt.png';
}

export default function PromotionalProductsClient() {
  const categories = getSortedCategories();

  return (
    <div>
      {/* Hero 区域 */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            Custom Promotional Products
          </h1>
          <p className={styles.heroSubtitle}>
            Upload your business logo or design your own promotional swag items
          </p>
          <Link href="/design-lab" className={styles.heroCta}>
            Start Designing
          </Link>
        </div>
      </section>

      {/* 类别网格区域 */}
      <section className={styles.categoriesSection}>
        <div className={styles.categoriesContainer}>
          <h2 className={styles.sectionTitle}>
            Shop by Category
          </h2>
          <p className={styles.sectionSubtitle}>
            Browse our wide selection of custom promotional products and marketing swag
          </p>

          <div className={styles.categoriesGrid}>
            {categories.map((category) => {
              const imagePath = getCategoryImagePath(category);

              return (
                <Link
                  key={category.id}
                  href={`/products?category=${category.slug}`}
                  className={styles.categoryCard}
                  aria-label={`Browse ${category.name} promotional products`}
                >
                  <div className={styles.categoryCardImage}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePath}
                      alt={category.name}
                      className={styles.categoryImage}
                      onError={(e) => {
                        // 如果图片加载失败，使用备用图片
                        const target = e.target as HTMLImageElement;
                        target.src = '/assets/categories/cat-tshirt.png';
                      }}
                    />
                  </div>
                  <div className={styles.categoryCardContent}>
                    <h3 className={styles.categoryCardLabel}>{category.name}</h3>
                    {category.description && (
                      <p className={styles.categoryCardDescription}>
                        {category.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* 联系/帮助区域 */}
      <section className={styles.helpSection}>
        <div className={styles.helpContainer}>
          <h2 className={styles.helpTitle}>
            Product Experts Available 7 Days a Week
          </h2>
          <p className={styles.helpDescription}>
            Not sure what to buy? We&apos;ll point you to the right product!
          </p>
          <div className={styles.helpContact}>
            <div className={styles.helpContactItem}>
              <strong>Phone:</strong>
              <span>416 916 6352</span>
            </div>
            <div className={styles.helpContactItem}>
              <strong>Email:</strong>
              <span>support@example.com</span>
            </div>
            <Link href="/contact" className={styles.helpCta}>
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

