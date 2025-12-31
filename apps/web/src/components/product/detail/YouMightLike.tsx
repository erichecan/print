/**
 * YouMightLike Component - Redbubble Style
* 参考图一："T-shirts you might like" 推荐卡片
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';

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
    <section className="you-might-like" aria-label={title}>
      <div className="you-might-like-header">
        <h2 className="you-might-like-title">{title}</h2>
        <Link href="/products" className="you-might-like-link">
          See more
        </Link>
      </div>
      <div className="you-might-like-grid">
        {products.map((product) => (
          <Link
            key={product.id}
            href={product.link}
            className="you-might-like-item"
            aria-label={`${product.title} - ${formatPrice(product.price)}`}
          >
            <div className="you-might-like-image-wrapper">
              <Image
                src={product.url}
                alt={product.title}
                width={300}
                height={300}
                className="you-might-like-image"
              />
            </div>
            <div className="you-might-like-info">
              <div className="you-might-like-title-text">{product.title}</div>
              <div className="you-might-like-price">{formatPrice(product.price)}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

