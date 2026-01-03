/**
 * YouMightLike Component - Redbubble Style
* 参考图一："T-shirts you might like" 推荐卡片
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';

import styles from './YouMightLike.module.css';

interface RecommendedProduct {
  id: string;
  title: string;
  url: string;
  price: number;
  link: string;
}

interface YouMightLikeProps {
  title: string;
  products: RecommendedProduct[];
}

export function YouMightLike({ title, products }: YouMightLikeProps) {
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <section className={styles['you-might-like']} aria-label={title}>
      <div className={styles['you-might-like-header']}>
        <h2 className={styles['you-might-like-title']}>{title}</h2>
        <Link href="/products" className={styles['you-might-like-link']}>
          See more
        </Link>
      </div>
      <div className={styles['you-might-like-grid']}>
        {products.map((product) => (
          <Link
            key={product.id}
            href={product.link}
            className={styles['you-might-like-item']}
            aria-label={`${product.title} - ${formatPrice(product.price)}`}
          >
            <div className={styles['you-might-like-image-wrapper']}>
              <Image
                src={product.url}
                alt={product.title}
                width={300}
                height={300}
                className={styles['you-might-like-image']}
              />
            </div>
            <div className={styles['you-might-like-info']}>
              <div className={styles['you-might-like-title-text']}>{product.title}</div>
              <div className={styles['you-might-like-price']}>{formatPrice(product.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

