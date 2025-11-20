/**
 * ProductFeatures Component - Redbubble Style
 * [2025-11-19 09:12:00] 参考图一：产品特性列表
 */
'use client';

import styles from './ProductFeatures.module.css';

interface ProductFeaturesProps {
  features: string[];
  rating: {
    average: number;
    count: number;
  };
}

export function ProductFeatures({ features, rating }: ProductFeaturesProps) {
  return (
    <div className={styles.productFeatures}>
      {/* [2025-11-19 09:12:00] 参考图一位置：评分显示 */}
      <div className={styles.productFeaturesRating} aria-label={`${rating.average} out of 5 stars, ${rating.count} reviews`}>
        <div className={styles.productFeaturesRatingStars} aria-hidden="true">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={`${styles.productFeaturesStar} ${i < Math.floor(rating.average) ? styles.filled : ''}`}
            >
              ★
            </span>
          ))}
        </div>
        <span className={styles.productFeaturesRatingValue}>{rating.average.toFixed(2)}</span>
        <span className={styles.productFeaturesRatingCount}>({rating.count} reviews)</span>
      </div>

      {/* [2025-11-19 09:12:00] 参考图一位置：Product features 列表 */}
      <div className={styles.productFeaturesList}>
        <h3 className={styles.productFeaturesTitle}>Product features</h3>
        <ul className={styles.productFeaturesItems} role="list">
          {features.map((feature, index) => (
            <li key={index} className={styles.productFeaturesItem}>
              {feature}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

