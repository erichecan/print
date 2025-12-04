/**
 * 促销产品页面客户端组件
 * [2025-01-29 12:00:00] 显示 Hero 区域、类别网格、FAQ 和联系信息
 */
'use client';

import Link from 'next/link';
import { getSortedCategories, type PromotionalCategory } from '@/data/promotional-categories';
import styles from './promotional-products.module.css';

/**
 * FAQ 数据
 * [2025-01-29 12:00:00] 参考 Custom Ink 页面的 FAQ 内容
 */
const faqs = [
  {
    question: 'What are promotional products?',
    answer: 'Promotional products are custom marketing merchandise featuring your company\'s logo or design. They include popular corporate swag items like pens, custom t-shirts, tote bags, and water bottles. Businesses use them for trade shows, client gifts, and employee appreciation to help gain brand impressions over time.'
  },
  {
    question: 'Why are promotional products important?',
    answer: 'Custom promotional items help your company effectively gain a large quantity of brand impressions at a relatively reasonable cost. By adding your company\'s logo to popular custom promo products you can easily make connections with prospective customers, clients, and brand champions.'
  },
  {
    question: 'Who buys promo products?',
    answer: 'Businesses of all sizes, including corporations, small companies, and non-profits use branded promotional products to raise visibility and connect with audiences. Companies in all industries use custom products for conferences and trade show booths, branded client gifts, sales material, and employee recognition and team building.'
  },
  {
    question: 'What are the most popular promotional products?',
    answer: 'The most popular custom promotional items are custom t-shirts, drinkware, bags, pens, hats, and tech products. These items are budget-friendly, easy to order in bulk, and always useful, which is why they remain customer favorites.'
  },
  {
    question: 'How do I get started creating custom promotional products?',
    answer: 'We offer a wide selection of popular promotional items. Upload your logo or design, start with a template, or create from scratch in our Design Lab. Choose from thousands of promo products, and our team of experts can help you find the right product for your organization and can guide you through the process from start to finish.'
  },
  {
    question: 'Can I put my logo on promotional products?',
    answer: 'Yes! We make it easy to add your company\'s logo to thousands of custom promotional items, from custom water bottles and tech accessories to custom t-shirts and office supplies. Upload your logo to our Design Lab, create a new design from scratch, or work with our team of experts to create a promo product bundle that best serves your team\'s needs.'
  }
];

/**
 * 获取图片路径，如果本地图片不存在则使用备用图片
 * [2025-01-29 12:00:00] 辅助函数，处理图片路径和备用方案
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

      {/* FAQ 区域 */}
      <section className={styles.faqSection}>
        <div className={styles.faqContainer}>
          <h2 className={styles.faqTitle}>
            Frequently Asked Questions
          </h2>
          <ul className={styles.faqList}>
            {faqs.map((faq, index) => (
              <li key={index} className={styles.faqItem}>
                <h3 className={styles.faqQuestion}>{faq.question}</h3>
                <p className={styles.faqAnswer}>{faq.answer}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 联系/帮助区域 */}
      <section className={styles.helpSection}>
        <div className={styles.helpContainer}>
          <h2 className={styles.helpTitle}>
            Product Experts Available 7 Days a Week
          </h2>
          <p className={styles.helpDescription}>
            Not sure what to buy? We'll point you to the right product!
          </p>
          <div className={styles.helpContact}>
            <div className={styles.helpContactItem}>
              <strong>Phone:</strong>
              <span>800-293-4232</span>
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

