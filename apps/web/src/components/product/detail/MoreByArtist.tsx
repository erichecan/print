/**
 * MoreByArtist Component - Redbubble Style
* 参考图一："More by this artist" 卡片栅格
* 添加条件渲染：无商品时隐藏整个板块
 */
'use client';

import Link from 'next/link';
import Image from 'next/image';

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
      className="more-by-artist" 
      aria-label={`More products by ${artistName}`}
      data-testid="artist-more-section"
    >
      <div className="more-by-artist-header">
        <h2 className="more-by-artist-title">More by this artist</h2>
        {artistShopUrl && (
          <Link href={artistShopUrl} className="more-by-artist-link">
            View shop
          </Link>
        )}
      </div>
      <ul className="more-by-artist-grid">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={product.link}
              className="more-by-artist-item"
              aria-label={`${product.title} - ${formatPrice(product.price)}`}
              data-testid={`artist-more-card-${product.id}`}
            >
              <div className="more-by-artist-image-wrapper">
                <Image
                  src={product.url}
                  alt={product.title}
                  width={300}
                  height={300}
                  className="more-by-artist-image"
                  loading="lazy"
                />
              </div>
              <div className="more-by-artist-info">
                <div 
                  className="more-by-artist-title-text" 
                  title={product.title}
                >
                  {product.title}
                </div>
                <div className="more-by-artist-price">{formatPrice(product.price)}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

