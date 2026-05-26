'use client';

import Link from 'next/link';
import Image from 'next/image';
import styles from './MoreByArtist.module.css';

interface ArtistProduct {
  id: string;
  title: string;
  url: string;
  price: number;
  link: string;
}

interface MoreByArtistProps {
  artistName: string;
  artistShopUrl: string;
  products: ArtistProduct[];
}

export function MoreByArtist({ artistName, artistShopUrl, products }: MoreByArtistProps) {
// 条件渲染：无商品或商品数量为0时，完全不渲染该板块
  if (!products || products.length === 0) {
    return null;
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-CA', {
      style: 'currency',
      currency: 'CAD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <section
      className={styles['more-by-artist']}
      aria-label={`More products by ${artistName}`}
      data-testid="artist-more-section"
    >
      <div className={styles['more-by-artist-header']}>
        <h2 className={styles['more-by-artist-title']}>More by this artist</h2>
        {artistShopUrl && (
          <Link href={artistShopUrl} className={styles['more-by-artist-link']}>
            View shop
          </Link>
        )}
      </div>
      <ul className={styles['more-by-artist-grid']}>
        {products.slice(0, 8).map((product) => (
          <li key={product.id}>
            <Link
              href={product.link}
              className={styles['more-by-artist-item']}
              aria-label={`${product.title} - ${formatPrice(product.price)}`}
              data-testid={`artist-more-card-${product.id}`}
            >
              <div className={styles['more-by-artist-image-wrapper']}>
                <Image
                  src={product.url}
                  alt={product.title}
                  width={300}
                  height={300}
                  className={styles['more-by-artist-image']}
                  loading="lazy"
                />
              </div>
              <div className={styles['more-by-artist-info']}>
                <div
                  className={styles['more-by-artist-title-text']}
                  title={product.title}
                >
                  {product.title}
                </div>
                <div className={styles['more-by-artist-price']}>{formatPrice(product.price)}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

