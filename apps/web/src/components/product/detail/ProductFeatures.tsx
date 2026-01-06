/**
 * ProductFeatures Component - Redbubble Style
 * 参考图一：产品特性列表
 */
'use client';

import styles from './ProductFeatures.module.css';

interface ProductFeaturesProps {
  description?: string | null;
  longDescription?: string | null;
  features: string[];
  rating: {
    average: number;
    count: number;
  };
}

export function ProductFeatures({ features, rating, description, longDescription }: ProductFeaturesProps) {
  return (
    <div className={styles.productFeatures}>
      {/* 参考图一位置：评分显示 */}
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

      {/* Description Section */}
      {description && (
        <div className={styles.productFeaturesSection} style={{ marginTop: '16px' }}>
          <h3 className={styles.productFeaturesTitle} style={{ marginBottom: '8px' }}>Description</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#4a4a4a' }}>
            {description}
          </div>
        </div>
      )}

      {/* Detailed Description Section */}
      {longDescription && (
        <div className={styles.productFeaturesSection} style={{ marginTop: '16px' }}>
          <h3 className={styles.productFeaturesTitle} style={{ marginBottom: '8px' }}>Detailed Description</h3>
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', color: '#4a4a4a' }}>
            {longDescription}
          </div>
        </div>
      )}


    </div>
  );
}
